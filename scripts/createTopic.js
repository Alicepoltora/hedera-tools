/**
 * Script: Create an HCS topic for sustainability data logging
 * Usage: node scripts/createTopic.js
 */
import 'dotenv/config';
import { createTopic, submitMessage } from '../src/services/topicService.js';

const topicId = await createTopic('Sustainability Emissions Log — Hedera Apex 2026');

// Submit a sample genesis message
await submitMessage(topicId, {
  event: 'TOPIC_CREATED',
  project: 'hedera-tools',
  timestamp: new Date().toISOString(),
  note: 'Carbon credit tracking topic initialised',
});

console.log('──────────────────────────────────────');
console.log(`Topic ID: ${topicId}`);
console.log('Add TOPIC_ID to your .env to start logging sustainability events.');
console.log('──────────────────────────────────────');
