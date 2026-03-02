# API Examples - Identity Reconciliation Service

This file contains multiple examples of how to use the `/identify` endpoint.

## Example 1: Create New Primary Contact

**Scenario**: Customer makes first request with email only

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com"
  }'
```

**Response**:
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["alice@example.com"],
    "phoneNumbers": [],
    "secondaryContactIds": []
  }
}
```

---

## Example 2: Link Phone to Existing Email

**Scenario**: Same customer provides phone number later

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "phoneNumber": "+1234567890"
  }'
```

**Response**:
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["alice@example.com"],
    "phoneNumbers": ["+1234567890"],
    "secondaryContactIds": [2]
  }
}
```

**What Happened**:
- Found existing contact with email "alice@example.com" (ID: 1)
- Phone number is new
- Created secondary contact (ID: 2) with the phone number
- Linked secondary to primary

---

## Example 3: Link Two Different Contacts

**Scenario**: Multiple entry points for same customer

```bash
# First: Customer A signs up with phone
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+9876543210"
  }'
# Returns: primaryContactId: 3, secondaryContactIds: []

# Later: Same customer uses different email, same phone
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "phoneNumber": "+9876543210"
  }'
```

**Response**:
```json
{
  "contact": {
    "primaryContactId": 3,
    "emails": ["newemail@example.com"],
    "phoneNumbers": ["+9876543210"],
    "secondaryContactIds": [4]
  }
}
```

---

## Example 4: Merge Multiple Chains

**Scenario**: Two separate contact chains merge

**Setup**:
```
Chain 1: ID 1 (primary, email: alice@example.com)
         ID 2 (secondary, phone: +1111111111, linkedId: 1)

Chain 2: ID 3 (primary, email: bob@example.com)
         ID 4 (secondary, phone: +2222222222, linkedId: 3)
```

**Request** (uses email from Chain 2 and phone from Chain 1):
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "phoneNumber": "+1111111111"
  }'
```

**Response**:
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["alice@example.com", "bob@example.com"],
    "phoneNumbers": ["+1111111111", "+2222222222"],
    "secondaryContactIds": [2, 3, 4]
  }
}
```

**What Happened**:
- Found contact 2 with matching phone (secondary to 1)
- Found contact 3 with matching email (primary of its chain)
- Merged both chains
- Contact 1 is older → remains primary
- Contact 3 converted from primary to secondary
- All contacts linked to contact 1

---

## Example 5: Error - Missing Email and Phone

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (400)**:
```json
{
  "error": "Either email or phoneNumber must be provided",
  "statusCode": 400
}
```

---

## Example 6: Only Phone Number

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+9999999999"
  }'
```

**Response**:
```json
{
  "contact": {
    "primaryContactId": 5,
    "emails": [],
    "phoneNumbers": ["+9999999999"],
    "secondaryContactIds": []
  }
}
```

---

## Example 7: Only Email

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@company.com"
  }'
```

**Response**:
```json
{
  "contact": {
    "primaryContactId": 6,
    "emails": ["customer@company.com"],
    "phoneNumbers": [],
    "secondaryContactIds": []
  }
}
```

---

## Testing with Different Tools

### Using cURL (Command Line)

```bash
# Basic request
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# With headers display
curl -v -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Pretty print response
curl -s http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' | jq .
```

### Using PowerShell (Windows)

```powershell
$body = @{
    email = "test@example.com"
    phoneNumber = "+1234567890"
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "http://localhost:3000/identify" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json -Depth 10
```

### Using Python

```python
import requests
import json

url = "http://localhost:3000/identify"
payload = {
    "email": "test@example.com",
    "phoneNumber": "+1234567890"
}

response = requests.post(
    url,
    json=payload,
    headers={"Content-Type": "application/json"}
)

print(json.dumps(response.json(), indent=2))
```

### Using Node.js / JavaScript

```javascript
const axios = require('axios');

const identify = async () => {
  try {
    const response = await axios.post(
      'http://localhost:3000/identify',
      {
        email: 'test@example.com',
        phoneNumber: '+1234567890'
      }
    );
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
};

identify();
```

---

## Testing Script (Bash)

```bash
#!/bin/bash

# Script to test all identify scenarios

BASE_URL="http://localhost:3000"

echo "=== Test 1: Create primary contact ==="
curl -X POST $BASE_URL/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com"}' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Test 2: Link phone to existing email ==="
curl -X POST $BASE_URL/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","phoneNumber":"+1234567890"}' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Test 3: Error - no email or phone ==="
curl -X POST $BASE_URL/identify \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Test 4: Health check ==="
curl -X GET $BASE_URL/health \
  -w "\nStatus: %{http_code}\n\n"
```

Save as `test.sh` and run:
```bash
chmod +x test.sh
./test.sh
```

---

## Real-World Integration Example

### Express.js Client

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const IDENTIFY_SERVICE_URL = 'http://localhost:3000';

app.post('/api/customers', async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    // Call identity reconciliation service
    const identityResponse = await axios.post(
      `${IDENTIFY_SERVICE_URL}/identify`,
      { email, phoneNumber }
    );

    const { primaryContactId, emails, phoneNumbers, secondaryContactIds } =
      identityResponse.data.contact;

    // Use the consolidated contact info
    const customer = {
      consolidatedId: primaryContactId,
      allEmails: emails,
      allPhones: phoneNumbers,
      linkedProfiles: secondaryContactIds.length,
    };

    res.json(customer);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.message,
    });
  }
});

app.listen(4000, () => console.log('Client running on port 4000'));
```

---

## Response Time Expectations

- **Average response time**: 50-200ms
- **Cold start**: 500ms-1s (initial query)
- **With complex chains**: 200-500ms

---

## Testing Checklist

- [ ] Single new contact creation
- [ ] Linking to existing contact
- [ ] Merging two chains
- [ ] Error handling (no email/phone)
- [ ] Complex chain merging (3+ contacts)
- [ ] Duplicate removal from arrays
- [ ] Primary contact selection (oldest)
- [ ] Secondary contact creation
- [ ] Health check endpoint
- [ ] Response format validation

