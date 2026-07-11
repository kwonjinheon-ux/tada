# Marketplace Product Model

Marketplace is the first vertical. The user journey is browse, filter, save, view a listing, message a seller and publish a listing.

## Initial listing lifecycle

```text
draft -> available -> pending -> sold -> archived
```

- `draft`: only the owner can see it.
- `available`: publicly browsable.
- `pending`: a sale is in progress; visible to the owner and public according to product policy.
- `sold`: the media is displayed in grayscale and no purchase/offer actions are offered.
- `archived`: owner-only history.

## Future verticals

Jobs, Garage Sale and Local Services must have independent schemas and feature folders. They may reuse profiles, images, messaging and search primitives but must not be represented as special listing categories once their workflows diverge.
