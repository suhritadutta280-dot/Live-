# LiveQueen Security Specification

## 1. Data Invariants
1. **User Wallet & PII Isolation**: `/users/{userId}` documents are readable and writable only by the authenticated owner (`request.auth.uid == userId`). New users start with `coinBalance == 500`, `diamondBalance == 0`, and `isCreator == false`.
2. **Creator Onboarding Requires 18+ Confirmation**: Users cannot set `isCreator: true` without `isAdultConfirmed == true`.
3. **Follow Relationship Integrity**: A follow document at `/users/{userId}/following/{creatorId}` cannot exist unless `/creators/{creatorId}` exists, `userId == request.auth.uid`, and the follow count change on `/creators/{creatorId}` occurs atomically in the same batch (`existsAfter` / `!existsAfter`).
4. **Atomic Coin/Diamond Ledger**: Sending a gift requires an immutable `/users/{userId}/giftTransactions/{txId}` entry with catalog-enforced `coinCost in [10, 50, 250, 1000]`, matched `coinBalance` decrement on `/users/{userId}`, and matched `diamondTotal` increment on `/creators/{creatorId}` within the same transaction.
5. **No Raw Sensitive Payment/ID Data**: Schema allowlists (`keys().hasOnly(...)`) reject any unapproved fields such as `cardNumber`, `upiPin`, `ssn`, or `idDocument`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Shadow Field Injection on User**: `{ uid: "u1", ..., isAdmin: true }` -> Blocked by `hasOnly`.
2. **Self-Credited Coins on Signup**: `{ uid: "u1", coinBalance: 999999, ... }` -> Blocked by `coinBalance == 500` on create.
3. **Spoofed Follow Owner**: Creating `/users/victim/following/creator_aria` as attacker -> Blocked by `isOwner(userId)` & `userId == request.auth.uid`.
4. **Orphan Follow Target**: Creating `/users/u1/following/nonexistent_creator` -> Blocked by `exists(/creators/$(creatorId))`.
5. **Unpaired FollowerCount Inflation**: Updating `/creators/creator_aria` `followerCount: +10` without creating `/users/u1/following/creator_aria` -> Blocked by `existsAfter` & `+1` delta invariant.
6. **Client-Spoofed Timestamp**: Creating follow with `createdAt: "2020-01-01T00:00:00Z"` -> Blocked by `createdAt == request.time`.
7. **Unverified Email Write**: Authenticated token with `email_verified: false` attempting write -> Blocked by `isVerifiedUser()`.
8. **Underage Creator Activation**: Updating `/users/u1` with `{ isCreator: true, isAdultConfirmed: false }` -> Blocked by adult attestation check.
9. **Oversized Path ID Poisoning**: Creating doc at `/creators/aaa...(200 chars)` -> Blocked by `isValidId()` (`<= 128` & regex).
10. **Gift Price Tampering**: Creating `giftTransactions` with `{ giftId: "gala", coinCost: 1, diamondsCredited: 1000 }` -> Blocked by server catalog price & `diamondsCredited == coinCost`.
11. **Chat Impersonation**: Creating `/creators/creator_aria/messages/m1` with `senderUid: "other_uid"` -> Blocked by `senderUid == request.auth.uid`.
12. **Blanket User Scrape**: Listing `/users` -> Blocked by default-deny and owner-only `get`.
