import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicInfoQuery,
} from '@hashgraph/sdk';
import { getClient } from './hederaClient.js';

/**
 * Create a new HCS topic for logging sustainability data
 * @param {string} memo - Human-readable description
 * @returns {string} topicId
 */
export async function createTopic(memo = 'Sustainability Data Log') {
  const client = getClient();

  const tx = new TopicCreateTransaction().setTopicMemo(memo);
  const receipt = await (await tx.execute(client)).getReceipt(client);
  const topicId = receipt.topicId.toString();

  console.log(`✅ Topic created: ${topicId}`);
  return topicId;
}

/**
 * Submit a sustainability event message to an HCS topic
 * @param {string} topicId
 * @param {object} payload - JSON payload to submit
 */
export async function submitMessage(topicId, payload) {
  const client = getClient();
  const message = JSON.stringify(payload);

  const tx = new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message);

  const receipt = await (await tx.execute(client)).getReceipt(client);
  console.log(`✅ Message submitted to ${topicId} — seq#${receipt.topicSequenceNumber}`);
  return receipt.topicSequenceNumber.toString();
}

/**
 * Query topic info
 */
export async function getTopicInfo(topicId) {
  const client = getClient();
  const info = await new TopicInfoQuery().setTopicId(topicId).execute(client);
  return {
    topicId: info.topicId.toString(),
    memo: info.topicMemo,
    sequenceNumber: info.sequenceNumber.toString(),
  };
}

/**
 * Fetch topic messages from Mirror Node
 */
export async function getTopicMessages(topicId, limit = 25) {
  const mirrorUrl = process.env.MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com';
  const url = `${mirrorUrl}/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`;

  const res = await fetch(url);
  const data = await res.json();

  return (data.messages || []).map((msg) => ({
    sequenceNumber: msg.sequence_number,
    timestamp: msg.consensus_timestamp,
    content: Buffer.from(msg.message, 'base64').toString('utf-8'),
  }));
}
