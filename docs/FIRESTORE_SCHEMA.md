# Firestore Data Model

Rendezvous stores user profiles, contacts, groups, channels, and encrypted messages in Cloud Firestore.

## Collections

### `users/{userId}`

| Field | Type | Description |
| --- | --- | --- |
| `uid` | `string` | Firebase Auth UID |
| `email` | `string` | User email address |
| `displayName` | `string` | Public display name |
| `photoURL` | `string \| null` | Optional avatar URL |
| `publicKey` | `string \| null` | Base64 SPKI `RSA-OAEP` public key |
| `wrappedPrivateKey` | `string \| null` | JSON-serialized `PBKDF2` + `AES-GCM` wrapped PKCS#8 key |
| `createdAt` | `Timestamp` | Account creation timestamp |

#### Subcollection: `users/{userId}/contacts/{contactId}`

Stores saved user contacts (`uid`, `displayName`, `email`, `photoURL`, `addedAt`).

---

### `groups/{groupId}`

| Field | Type | Description |
| --- | --- | --- |
| `name` | `string` | Group name |
| `ownerId` | `string` | UID of the group creator |
| `members` | `string[]` | Array of member UIDs |
| `createdAt` | `Timestamp` | Creation timestamp |

#### Subcollection: `groups/{groupId}/channels/{channelId}`

| Field | Type | Description |
| --- | --- | --- |
| `name` | `string` | Channel name (e.g. `general`) |
| `createdAt` | `Timestamp` | Creation timestamp |

#### Subcollection: `groups/{groupId}/channels/{channelId}/messages/{messageId}`

| Field | Type | Description |
| --- | --- | --- |
| `senderId` | `string` | Sender UID |
| `senderName` | `string` | Sender display name |
| `encryptedPayload` | `Record<string, string>` | Per-recipient encrypted message payload |
| `fileUrl` | `string \| null` | Optional attachment URL |
| `fileName` | `string \| null` | Optional attachment filename |
| `fileType` | `string \| null` | Optional attachment MIME type |
| `timestamp` | `Timestamp` | Message timestamp (used for cursor pagination) |

---

### `directMessages/{conversationId}`

`conversationId` is deterministically formatted as `<sortedUid1>_<sortedUid2>`.

| Field | Type | Description |
| --- | --- | --- |
| `participants` | `string[]` | The two participant UIDs |
| `updatedAt` | `Timestamp` | Last activity timestamp |

#### Subcollection: `directMessages/{conversationId}/messages/{messageId}`

Uses the same encrypted message structure as group channel messages above.
