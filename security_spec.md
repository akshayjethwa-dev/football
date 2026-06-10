# Security Spec for Football Campaign Engine

## 1. Data Invariants
- **Clients**:
  - `id` must match the document path ID.
  - `name` is a required string under 128 characters.
  - `type` must be one of: `'cafe'`, `'retailer'`, `'gym'`, `'B2B'`, `'other'`.
  - `status` must be either `'active'` or `'inactive'`.
  - `createdAt` is immutable.
  - `updatedAt` and `createdAt` must match server-time during respective operations.
- **User Profiles**:
  - `id` must match `request.auth.uid` and the document path ID.
  - `role` must be one of: `'superadmin'`, `'clientadmin'`.
  - Standard users cannot promote themselves or modify their own role.

## 2. The Dirty Dozen Payloads
Below are 12 specific exploit and invalid payloads designed to verify security rules:

1. **Payload 1: Unauthenticated Client Creation**
   - *Target*: `/clients/new_id`
   - *Exploit*: Anonymous user attempts to create a client document.
   - *Expected Action*: `PERMISSION_DENIED`

2. **Payload 2: Identity Spoofing in User Profile**
   - *Target*: `/users/attacker_uid`
   - *Exploit*: Attacker attempts to create a profile where `id` is their UID but `role` is set to `'superadmin'` unverified.
   - *Expected Action*: `PERMISSION_DENIED` (role should default safely or only allow read/write from authorized superadmin, or match bootstrapped conditions).

3. **Payload 3: Client Type Value Poisoning**
   - *Target*: `/clients/test_client_id`
   - *Exploit*: Sending a document with type `"supermarket_cafe"` (unsupported enum value).
   - *Expected Action*: `PERMISSION_DENIED`

4. **Payload 4: Client ID Poisoning Attack**
   - *Target*: `/clients/some-massive-malicious-character-id`
   - *Exploit*: Attempt to poison database with a 1.5KB document ID.
   - *Expected Action*: `PERMISSION_DENIED`

5. **Payload 5: Role Escalation in User Profiles**
   - *Target*: `/users/regular_user_uid`
   - *Exploit*: Regular client admin role attempts to update their user profile role to `'superadmin'`.
   - *Expected Action*: `PERMISSION_DENIED`

6. **Payload 6: Client Name Size Exhaustion (Denial of Wallet)**
   - *Target*: `/clients/valid_id`
   - *Exploit*: Sending a name value containing 5MB of text.
   - *Expected Action*: `PERMISSION_DENIED` (string size constraints).

7. **Payload 7: Client Status Shortcutting**
   - *Target*: `/clients/valid_id`
   - *Exploit*: Updating client fields and modifying immutable timestamps (e.g. altering `createdAt` to have historical reference).
   - *Expected Action*: `PERMISSION_DENIED`

8. **Payload 8: Non-SuperAdmin Client List Scan**
   - *Target*: `/clients` (Query)
   - *Exploit*: Normal authenticated end user/client-admin attempting to list all clients of the company.
   - *Expected Action*: `PERMISSION_DENIED`

9. **Payload 9: Orphaned Client Validation Bypass**
   - *Target*: `/clients/new_id`
   - *Exploit*: Creating a client document with missing required fields (e.g. missing `contactEmail`).
   - *Expected Action*: `PERMISSION_DENIED`

10. **Payload 10: Client Sub-Resource Update by Unauthorized User**
    - *Target*: `/clients/client_a`
    - *Exploit*: Attempt to read or edit client details on behalf of another client's admin workspace.
    - *Expected Action*: `PERMISSION_DENIED`

11. **Payload 11: Spoofed Client Server Timestamp**
    - *Target*: `/clients/client_a`
    - *Exploit*: Setting `updatedAt` to a historical manual timestamp inside the future or past instead of `request.time`.
    - *Expected Action*: `PERMISSION_DENIED`

12. **Payload 12: Anonymous PII Read Leak**
    - *Target*: `/users/some_user_id`
    - *Exploit*: Non-owner trying to direct-get user profiles containing potential PII contact details.
    - *Expected Action*: `PERMISSION_DENIED`

## 3. The Test Runner
A mock execution flow would instantiate:
- Authenticated superadmin context -> Succeeds for client schema.
- Non-authenticated/Client context -> Rejected for across-the-board database-level controls.
