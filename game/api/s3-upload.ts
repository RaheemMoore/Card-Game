// The Game deployment's copy of the S3 init-image upload route. See the note in
// anthropic-messages.ts — the implementation deliberately stays shared.
//
// Reached only from inside the Leonardo flow (leonardoApi.ts uploads an init
// image before generating), which is why it ships with the game even though no
// game screen calls it directly.
export { default, config } from '../../card-engine/api/s3-upload.js';
