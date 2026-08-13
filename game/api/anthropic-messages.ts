// The Game deployment's copy of the Anthropic proxy route.
//
// The implementation stays in card-engine/api/ so the Studio and the Game run
// the SAME server code — the spend gate, JWT check and api_usage_events row are
// the things standing between a stranger and an Anthropic bill, and a forked
// second copy is how one of them quietly stops matching the other.
//
// This file exists only to claim the /api/anthropic-messages path in this
// project. Same shape as the Wiki's root api/card-reviews.ts wrapper.
export { default, config } from '../../card-engine/api/anthropic-messages.js';
