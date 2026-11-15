export type CreatorCategory = 'Music' | 'Talk & Lounge' | 'Art & Studio' | 'Gaming';

export interface Creator {
  creatorId: string;
  ownerUid: string;
  displayName: string;
  handle: string;
  bio: string;
  category: CreatorCategory;
  coverUrl: string;
  roomTitle: string;
  isLive: boolean;
  isPublic: boolean;
  viewerCount: number;
  followerCount: number;
  diamondTotal: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ThemePreference = 'midnight' | 'dim';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  isAdultConfirmed: boolean;
  isCreator: boolean;
  coinBalance: number;
  diamondBalance: number;
  themePreference?: ThemePreference;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FollowRelationship {
  userId: string;
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  creatorCategory: CreatorCategory;
  creatorCoverUrl: string;
  createdAt?: unknown;
}

export interface RoomMessage {
  messageId: string;
  creatorId: string;
  senderUid: string;
  senderName: string;
  text: string;
  kind: 'chat' | 'gift';
  createdAt?: unknown;
}

export type GiftId = 'rose' | 'crown' | 'champagne' | 'gala';

export interface GiftCatalogItem {
  id: GiftId;
  name: string;
  coinCost: 10 | 50 | 250 | 1000;
  description: string;
}

export interface GiftTransaction {
  txId: string;
  senderUid: string;
  creatorId: string;
  creatorName: string;
  giftId: GiftId;
  giftName: string;
  coinCost: number;
  diamondsCredited: number;
  createdAt?: unknown;
}

export interface LiveRoom {
  roomId: string;
  creatorId: string;
  hostUid: string;
  title: string;
  status: 'live' | 'ended';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AppView = 'discover' | 'following' | 'studio' | 'wallet';
