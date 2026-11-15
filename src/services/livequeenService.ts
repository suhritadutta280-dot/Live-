import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { SHOWCASE_CREATORS } from '../data/showcaseCreators';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Creator,
  CreatorCategory,
  GiftCatalogItem,
  ThemePreference,
  UserProfile,
} from '../types/livequeen';

function sanitizeId(raw: string, maxLen = 128): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, maxLen);
  return cleaned || 'id_' + Date.now();
}

function sanitizeHandle(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9_.]/g, '')
    .slice(0, 40);
  return cleaned.length >= 2 ? cleaned : 'creator_' + Date.now().toString().slice(-4);
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const uid = sanitizeId(user.uid);
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const displayName = (user.displayName || user.email?.split('@')[0] || 'Member')
      .trim()
      .slice(0, 64);
    const photoURL = (user.photoURL || '').slice(0, 512);

    const payload = {
      uid,
      displayName: displayName || 'Member',
      photoURL,
      isAdultConfirmed: false,
      isCreator: false,
      coinBalance: 500,
      diamondBalance: 0,
      themePreference: 'midnight',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, payload);
    const createdSnap = await getDoc(userRef);
    return createdSnap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function ensureShowcaseCreators(): Promise<void> {
  for (const creator of SHOWCASE_CREATORS) {
    const creatorPath = `creators/${creator.creatorId}`;
    const creatorRef = doc(db, 'creators', creator.creatorId);
    try {
      const snap = await getDoc(creatorRef);
      if (!snap.exists()) {
        await setDoc(creatorRef, {
          ...creator,
          followerCount: 0,
          diamondTotal: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, creatorPath);
    }
  }
}

export async function confirmAdultAge(uid: string): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      isAdultConfirmed: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function updateThemePreference(
  uid: string,
  themePreference: ThemePreference
): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      themePreference,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function followCreator(uid: string, creator: Creator): Promise<void> {
  const creatorId = sanitizeId(creator.creatorId);
  const followPath = `users/${uid}/following/${creatorId}`;
  const followRef = doc(db, 'users', uid, 'following', creatorId);
  const creatorRef = doc(db, 'creators', creatorId);

  try {
    const existingCreator = await getDoc(creatorRef);
    if (!existingCreator.exists()) {
      await ensureShowcaseCreators();
    }

    await runTransaction(db, async (transaction) => {
      const followSnap = await transaction.get(followRef);
      const creatorSnap = await transaction.get(creatorRef);

      if (!creatorSnap.exists()) {
        throw new Error('Creator channel does not exist.');
      }
      if (followSnap.exists()) {
        return;
      }

      const currentFollowers = Number(creatorSnap.data().followerCount || 0);

      transaction.set(followRef, {
        userId: uid,
        creatorId,
        creatorName: creator.displayName.slice(0, 80),
        creatorHandle: creator.handle.slice(0, 40),
        creatorCategory: creator.category,
        creatorCoverUrl: creator.coverUrl.slice(0, 512),
        createdAt: serverTimestamp(),
      });

      transaction.update(creatorRef, {
        followerCount: currentFollowers + 1,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, followPath);
  }
}

export async function unfollowCreator(uid: string, creatorIdRaw: string): Promise<void> {
  const creatorId = sanitizeId(creatorIdRaw);
  const followPath = `users/${uid}/following/${creatorId}`;
  const followRef = doc(db, 'users', uid, 'following', creatorId);
  const creatorRef = doc(db, 'creators', creatorId);

  try {
    await runTransaction(db, async (transaction) => {
      const followSnap = await transaction.get(followRef);
      const creatorSnap = await transaction.get(creatorRef);

      if (!followSnap.exists()) {
        return;
      }

      transaction.delete(followRef);

      if (creatorSnap.exists()) {
        const currentFollowers = Number(creatorSnap.data().followerCount || 0);
        if (currentFollowers >= 1) {
          transaction.update(creatorRef, {
            followerCount: currentFollowers - 1,
            updatedAt: serverTimestamp(),
          });
        }
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, followPath);
  }
}

export async function sendDemoGift(
  uid: string,
  senderName: string,
  creator: Creator,
  gift: GiftCatalogItem
): Promise<void> {
  const creatorId = sanitizeId(creator.creatorId);
  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const msgId = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const userRef = doc(db, 'users', uid);
  const creatorRef = doc(db, 'creators', creatorId);
  const txRef = doc(db, 'users', uid, 'giftTransactions', txId);
  const msgRef = doc(db, 'creators', creatorId, 'messages', msgId);

  try {
    const existingCreator = await getDoc(creatorRef);
    if (!existingCreator.exists()) {
      await ensureShowcaseCreators();
    }

    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const creatorSnap = await transaction.get(creatorRef);

      if (!userSnap.exists()) {
        throw new Error('User wallet not found.');
      }
      if (!creatorSnap.exists()) {
        throw new Error('Creator room not found.');
      }

      const currentCoins = Number(userSnap.data().coinBalance || 0);
      if (currentCoins < gift.coinCost) {
        throw new Error('Insufficient demo coins. Claim a demo top-up in your Wallet.');
      }

      const currentDiamonds = Number(creatorSnap.data().diamondTotal || 0);

      transaction.update(userRef, {
        coinBalance: currentCoins - gift.coinCost,
        updatedAt: serverTimestamp(),
      });

      transaction.update(creatorRef, {
        diamondTotal: currentDiamonds + gift.coinCost,
        updatedAt: serverTimestamp(),
      });

      transaction.set(txRef, {
        txId,
        senderUid: uid,
        creatorId,
        creatorName: creator.displayName.slice(0, 80),
        giftId: gift.id,
        giftName: gift.name.slice(0, 40),
        coinCost: gift.coinCost,
        diamondsCredited: gift.coinCost,
        createdAt: serverTimestamp(),
      });

      transaction.set(msgRef, {
        messageId: msgId,
        creatorId,
        senderUid: uid,
        senderName: (senderName || 'Viewer').trim().slice(0, 64),
        text: `Sent ${gift.name} (${gift.coinCost} Demo Coins)`,
        kind: 'gift',
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/giftTransactions/${txId}`);
  }
}

export async function claimDemoTopUp(uid: string): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) {
        throw new Error('User profile not initialized.');
      }
      const current = Number(snap.data().coinBalance || 0);
      if (current >= 100) {
        throw new Error('Demo top-up is available when balance is below 100 coins.');
      }
      transaction.update(userRef, {
        coinBalance: current + 250,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function sendRoomMessage(
  uid: string,
  senderName: string,
  creatorIdRaw: string,
  rawText: string
): Promise<void> {
  const creatorId = sanitizeId(creatorIdRaw);
  const text = rawText.trim().slice(0, 280);
  if (!text) return;

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const msgPath = `creators/${creatorId}/messages/${messageId}`;
  const msgRef = doc(collection(db, 'creators', creatorId, 'messages'), messageId);
  const creatorRef = doc(db, 'creators', creatorId);

  try {
    const creatorSnap = await getDoc(creatorRef);
    if (!creatorSnap.exists()) {
      await ensureShowcaseCreators();
    }

    await setDoc(msgRef, {
      messageId,
      creatorId,
      senderUid: uid,
      senderName: (senderName || 'Viewer').trim().slice(0, 64),
      text,
      kind: 'chat',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, msgPath);
  }
}

export async function upsertMyCreatorChannel(
  uid: string,
  input: {
    displayName: string;
    handle: string;
    bio: string;
    category: CreatorCategory;
    roomTitle: string;
    isLive: boolean;
    coverUrl?: string;
  }
): Promise<void> {
  const creatorId = sanitizeId(uid);
  const creatorRef = doc(db, 'creators', creatorId);
  const userRef = doc(db, 'users', uid);

  const payload = {
    displayName: input.displayName.trim().slice(0, 80) || 'Creator Studio',
    handle: sanitizeHandle(input.handle),
    bio: input.bio.trim().slice(0, 280) || '18+ live creator channel on LiveQueen.',
    category: input.category,
    coverUrl: (input.coverUrl || '/src/assets/images/creator_aria_studio_1794725282754.jpg').slice(0, 512),
    roomTitle: input.roomTitle.trim().slice(0, 120) || 'Live Creator Session',
    isLive: input.isLive,
    isPublic: true,
    viewerCount: input.isLive ? 1 : 0,
  };

  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const creatorSnap = await transaction.get(creatorRef);

      if (!userSnap.exists() || userSnap.data().isAdultConfirmed !== true) {
        throw new Error('Adult (18+) confirmation is required before creating a creator channel.');
      }

      if (!userSnap.data().isCreator) {
        transaction.update(userRef, {
          isCreator: true,
          updatedAt: serverTimestamp(),
        });
      }

      if (creatorSnap.exists()) {
        transaction.update(creatorRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        transaction.set(creatorRef, {
          creatorId,
          ownerUid: uid,
          ...payload,
          followerCount: 0,
          diamondTotal: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `creators/${creatorId}`);
  }
}

export async function createLiveRoom(
  uid: string,
  input: {
    title: string;
    displayName: string;
    handle: string;
    bio: string;
    category: CreatorCategory;
    coverUrl?: string;
  }
): Promise<{ roomId: string }> {
  const creatorId = sanitizeId(uid);
  const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const cleanTitle = input.title.trim().slice(0, 120) || 'Welcome to my Live';

  const userRef = doc(db, 'users', uid);
  const creatorRef = doc(db, 'creators', creatorId);
  const roomRef = doc(db, 'liveRooms', roomId);

  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const creatorSnap = await transaction.get(creatorRef);

      if (!userSnap.exists() || userSnap.data().isAdultConfirmed !== true) {
        throw new Error('Adult (18+) confirmation is required before going live.');
      }

      if (!userSnap.data().isCreator) {
        transaction.update(userRef, {
          isCreator: true,
          updatedAt: serverTimestamp(),
        });
      }

      if (creatorSnap.exists()) {
        transaction.update(creatorRef, {
          roomTitle: cleanTitle,
          isLive: true,
          viewerCount: 1,
          updatedAt: serverTimestamp(),
        });
      } else {
        transaction.set(creatorRef, {
          creatorId,
          ownerUid: uid,
          displayName: input.displayName.trim().slice(0, 80) || 'Creator Studio',
          handle: sanitizeHandle(input.handle),
          bio: input.bio.trim().slice(0, 280) || '18+ live creator channel on LiveQueen.',
          category: input.category,
          coverUrl: (input.coverUrl || '/src/assets/images/creator_aria_studio_1794725282754.jpg').slice(0, 512),
          roomTitle: cleanTitle,
          isLive: true,
          isPublic: true,
          viewerCount: 1,
          followerCount: 0,
          diamondTotal: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      transaction.set(roomRef, {
        roomId,
        creatorId,
        hostUid: uid,
        title: cleanTitle,
        status: 'live',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return { roomId };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `liveRooms/${roomId}`);
  }
}

export async function endLiveRoom(uid: string, roomIdRaw?: string): Promise<void> {
  const creatorId = sanitizeId(uid);
  const creatorRef = doc(db, 'creators', creatorId);
  const roomId = roomIdRaw ? sanitizeId(roomIdRaw) : '';
  const roomRef = roomId ? doc(db, 'liveRooms', roomId) : null;

  try {
    await runTransaction(db, async (transaction) => {
      const creatorSnap = await transaction.get(creatorRef);
      const roomSnap = roomRef ? await transaction.get(roomRef) : null;

      if (roomRef && roomSnap?.exists() && roomSnap.data().status === 'live') {
        transaction.update(roomRef, {
          status: 'ended',
          updatedAt: serverTimestamp(),
        });
      }

      if (creatorSnap.exists()) {
        transaction.update(creatorRef, {
          isLive: false,
          viewerCount: 0,
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      roomId ? `liveRooms/${roomId}` : `creators/${creatorId}`
    );
  }
}

export function subscribeToFollowedCreatorsLiveStatus(
  uid: string,
  onCreatorWentLive: (creator: Creator) => void
): () => void {
  const followedIds = new Set<string>();
  const previousLiveState = new Map<string, boolean>();
  let creatorsInitialized = false;

  const followsPath = `users/${uid}/following`;
  const followsQuery = query(
    collection(db, 'users', uid, 'following'),
    where('userId', '==', uid)
  );

  const unsubFollows = onSnapshot(
    followsQuery,
    (snapshot) => {
      followedIds.clear();
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (typeof data.creatorId === 'string') {
          followedIds.add(data.creatorId);
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, followsPath);
    }
  );

  const creatorsQuery = query(
    collection(db, 'creators'),
    where('isPublic', '==', true)
  );

  const unsubCreators = onSnapshot(
    creatorsQuery,
    (snapshot) => {
      if (!creatorsInitialized) {
        for (const docSnap of snapshot.docs) {
          const creator = docSnap.data() as Creator;
          previousLiveState.set(creator.creatorId, Boolean(creator.isLive));
        }
        creatorsInitialized = true;
        return;
      }

      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added' && change.type !== 'modified') continue;
        const creator = change.doc.data() as Creator;
        const wasLive = previousLiveState.get(creator.creatorId) ?? false;
        const isNowLive = Boolean(creator.isLive);
        previousLiveState.set(creator.creatorId, isNowLive);

        if (!wasLive && isNowLive && followedIds.has(creator.creatorId)) {
          onCreatorWentLive(creator);
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'creators');
    }
  );

  return () => {
    unsubFollows();
    unsubCreators();
  };
}

export function subscribeToCreatorLiveStatus(
  uid: string,
  creatorIdRaw: string,
  onCreatorWentLive: (creator: Creator) => void
): () => void {
  const creatorId = sanitizeId(creatorIdRaw);
  const creatorPath = `creators/${creatorId}`;
  const followPath = `users/${uid}/following/${creatorId}`;

  let isFollowing = false;
  let initialized = false;
  let wasLive = false;

  const unsubFollow = onSnapshot(
    doc(db, 'users', uid, 'following', creatorId),
    (snap) => {
      isFollowing = snap.exists();
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, followPath);
    }
  );

  const unsubCreator = onSnapshot(
    doc(db, 'creators', creatorId),
    (snap) => {
      if (!snap.exists()) return;
      const creator = snap.data() as Creator;
      const isNowLive = Boolean(creator.isLive);

      if (!initialized) {
        wasLive = isNowLive;
        initialized = true;
        return;
      }

      if (!wasLive && isNowLive && isFollowing) {
        onCreatorWentLive(creator);
      }
      wasLive = isNowLive;
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, creatorPath);
    }
  );

  return () => {
    unsubFollow();
    unsubCreator();
  };
}
