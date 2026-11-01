# @ludvigalden-demo/tecken-contracts

Shared schemas and types for the Tecken demonstration (utterance, provenance, rights, review and caption records).

## Review status vocabulary

A clip record's review status is `source-published` or `reviewed`.
`source-published` means published by its source and not reviewed here;
`reviewed` requires a named reviewer, and validation rejects the record
otherwise. No other value is valid.

Part of [tecken-demo](https://github.com/ludvigalden/tecken-demo). Licensed MIT.
