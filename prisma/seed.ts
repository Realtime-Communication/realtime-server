// const { PrismaClient } = require('@prisma/client');
// const bcrypt = require('bcryptjs');

// class SecutiryUtils {
//   static async hashingPassword(password) {
//     const SALT_OR_ROUNDS = 10;
//     return await bcrypt.hash(password, SALT_OR_ROUNDS);
//   }
// }

// const prisma = new PrismaClient();

// async function main() {
//   // Default password for all users
//   const defaultPassword = '12345678';
//   const hashedPassword = await SecutiryUtils.hashingPassword(defaultPassword);
//   await prisma.user.createMany({
//     data: [
//       // {
//       //   id: 3,
//       //   phone: '+1234567890',
//       //   email: 'user3@example.com',
//       //   password: 'hashedpassword3',
//       //   first_name: 'Alice',
//       //   last_name: 'Smith',
//       //   is_active: true,
//       //   created_at: new Date('2025-05-01T10:00:00Z'),
//       // },
//       {
//         id: 4,
//         phone: '+1234567891',
//         email: 'user4@example.com',
//         password: 'hashedpassword4',
//         first_name: 'Bob',
//         last_name: 'Johnson',
//         is_active: true,
//         created_at: new Date('2025-05-01T10:00:00Z'),
//       },
//       {
//         id: 5,
//         phone: '+1234567892',
//         email: 'user5@example.com',
//         password: 'hashedpassword5',
//         first_name: 'Charlie',
//         last_name: 'Brown',
//         is_active: true,
//         created_at: new Date('2025-05-01T10:00:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create friend relationships
//   await prisma.friend.createMany({
//     data: [
//       {
//         requester_id: 3,
//         receiver_id: 4,
//         status: 'ACCEPTED',
//         created_at: new Date('2025-05-01T10:00:00Z'),
//       },
//       {
//         requester_id: 5,
//         receiver_id: 3,
//         status: 'PENDING',
//         created_at: new Date('2025-05-02T12:00:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create conversations
//   await prisma.conversation.createMany({
//     data: [
//       {
//         title: 'Chat with Friend 4',
//         creator_id: 3,
//         channel_id: 1,
//         created_at: new Date('2025-05-01T10:30:00Z'),
//         updated_at: new Date('2025-05-01T10:30:00Z'),
//         avatar_url: 'https://example.com/avatar1.png',
//       },
//       {
//         title: 'Group Chat',
//         creator_id: 5,
//         channel_id: 2,
//         created_at: new Date('2025-05-02T12:30:00Z'),
//         updated_at: new Date('2025-05-02T12:30:00Z'),
//         avatar_url: 'https://example.com/avatar2.png',
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create participants
//   await prisma.participant.createMany({
//     data: [
//       {
//         conversation_id: 1,
//         user_id: 3,
//         type: 'lead',
//         created_at: new Date('2025-05-01T10:30:00Z'),
//         updated_at: new Date('2025-05-01T10:30:00Z'),
//       },
//       {
//         conversation_id: 1,
//         user_id: 4,
//         type: 'member',
//         created_at: new Date('2025-05-01T10:30:00Z'),
//         updated_at: new Date('2025-05-01T10:30:00Z'),
//       },
//       {
//         conversation_id: 2,
//         user_id: 3,
//         type: 'member',
//         created_at: new Date('2025-05-02T12:30:00Z'),
//         updated_at: new Date('2025-05-02T12:30:00Z'),
//       },
//       {
//         conversation_id: 2,
//         user_id: 5,
//         type: 'lead',
//         created_at: new Date('2025-05-02T12:30:00Z'),
//         updated_at: new Date('2025-05-02T12:30:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create messages
//   await prisma.message.createMany({
//     data: [
//       {
//         guid: 'msg1-uuid',
//         conversation_id: 1,
//         sender_id: 3,
//         message_type: 'text',
//         content: 'Hey, how are you?',
//         created_at: new Date('2025-05-01T10:35:00Z'),
//         call_type: 'voice',
//         callStatus: 'ENDED',
//         status: 'sent',
//       },
//       {
//         guid: 'msg2-uuid',
//         conversation_id: 1,
//         sender_id: 4,
//         message_type: 'text',
//         content: 'Doing great, thanks!',
//         created_at: new Date('2025-05-01T10:36:00Z'),
//         call_type: 'voice',
//         callStatus: 'ENDED',
//         status: 'delivered',
//       },
//       {
//         guid: 'msg3-uuid',
//         conversation_id: 2,
//         sender_id: 5,
//         message_type: 'text',
//         content: 'Welcome to the group chat!',
//         created_at: new Date('2025-05-02T12:35:00Z'),
//         call_type: 'voice',
//         callStatus: 'ENDED',
//         status: 'read',
//       },
//     ],
//     skipDuplicates: true,
//   });
//   // Create Users
//   await prisma.user.createMany({
//     data: [
//       {
//         phone: '+12345678901',
//         email: 'alice@example.com',
//         password: hashedPassword,
//         first_name: 'Alice',
//         last_name: 'Smith',
//         is_active: true,
//         created_at: new Date('2025-05-07T10:00:00Z'),
//         updated_at: new Date('2025-05-07T10:00:00Z'),
//       },
//       {
//         phone: '+12345678902',
//         email: 'bob@example.com',
//         password: hashedPassword,
//         first_name: 'Bob',
//         last_name: 'Johnson',
//         is_active: true,
//         created_at: new Date('2025-05-07T10:05:00Z'),
//         updated_at: new Date('2025-05-07T10:05:00Z'),
//       },
//       {
//         phone: '+12345678903',
//         email: 'carol@example.com',
//         password: hashedPassword,
//         first_name: 'Carol',
//         last_name: 'Williams',
//         is_active: true,
//         created_at: new Date('2025-05-07T10:10:00Z'),
//         updated_at: new Date('2025-05-07T10:10:00Z'),
//       },
//       {
//         phone: '+12345678904',
//         email: 'david@example.com',
//         password: hashedPassword,
//         first_name: 'David',
//         last_name: 'Brown',
//         is_active: false,
//         created_at: new Date('2025-05-07T10:15:00Z'),
//         updated_at: new Date('2025-05-07T10:15:00Z'),
//       },
//       {
//         phone: '+12345678905',
//         email: 'emma@example.com',
//         password: hashedPassword,
//         first_name: 'Emma',
//         last_name: 'Davis',
//         is_active: true,
//         created_at: new Date('2025-05-07T10:20:00Z'),
//         updated_at: new Date('2025-05-07T10:20:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Fetch created user IDs
//   const alice = await prisma.user.findUnique({
//     where: { email: 'alice@example.com' },
//   });
//   const bob = await prisma.user.findUnique({
//     where: { email: 'bob@example.com' },
//   });
//   const carol = await prisma.user.findUnique({
//     where: { email: 'carol@example.com' },
//   });
//   const david = await prisma.user.findUnique({
//     where: { email: 'david@example.com' },
//   });
//   const emma = await prisma.user.findUnique({
//     where: { email: 'emma@example.com' },
//   });

//   // Create Devices
//   // await prisma.device.createMany({
//   //   data: [
//   //     {
//   //       user_id: alice.id,
//   //       device_id: 'device_alice_1',
//   //       device_token: 'token_alice_1',
//   //       type: 'APPLE',
//   //       created_at: new Date('2025-05-07T10:25:00Z'),
//   //       updated_at: new Date('2025-05-07T10:25:00Z'),
//   //     },
//   //     {
//   //       user_id: bob.id,
//   //       device_id: 'device_bob_1',
//   //       device_token: 'token_bob_1',
//   //       type: 'APPLE',
//   //       created_at: new Date('2025-05-07T10:30:00Z'),
//   //       updated_at: new Date('2025-05-07T10:30:00Z'),
//   //     },
//   //     {
//   //       user_id: carol.id,
//   //       device_id: 'device_carol_1',
//   //       device_token: 'token_carol_1',
//   //       type: 'APPLE',
//   //       created_at: new Date('2025-05-07T10:35:00Z'),
//   //       updated_at: new Date('2025-05-07T10:35:00Z'),
//   //     },
//   //     {
//   //       user_id: emma.id,
//   //       device_id: 'device_emma_1',
//   //       device_token: 'token_emma_1',
//   //       type: 'APPLE',
//   //       created_at: new Date('2025-05-07T10:40:00Z'),
//   //       updated_at: new Date('2025-05-07T10:40:00Z'),
//   //     },
//   //   ],
//   //   skipDuplicates: true,
//   // });

//   // // Create Accesses
//   // const deviceAlice = await prisma.device.findFirst({
//   //   where: { user_id: alice.id },
//   // });
//   // const deviceBob = await prisma.device.findFirst({
//   //   where: { user_id: bob.id },
//   // });
//   // const deviceCarol = await prisma.device.findFirst({
//   //   where: { user_id: carol.id },
//   // });
//   // const deviceEmma = await prisma.device.findFirst({
//   //   where: { user_id: emma.id },
//   // });
//   // await prisma.access.createMany({
//   //   data: [
//   //     {
//   //       user_id: alice.id,
//   //       device_id: deviceAlice.id,
//   //       token: 'access_token_alice_1',
//   //       created_at: new Date('2025-05-07T10:45:00Z'),
//   //     },
//   //     {
//   //       user_id: bob.id,
//   //       device_id: deviceBob.id,
//   //       token: 'access_token_bob_1',
//   //       created_at: new Date('2025-05-07T10:50:00Z'),
//   //     },
//   //     {
//   //       user_id: carol.id,
//   //       device_id: deviceCarol.id,
//   //       token: 'access_token_carol_1',
//   //       created_at: new Date('2025-05-07T10:55:00Z'),
//   //     },
//   //     {
//   //       user_id: emma.id,
//   //       device_id: deviceEmma.id,
//   //       token: 'access_token_emma_1',
//   //       created_at: new Date('2025-05-07T11:00:00Z'),
//   //     },
//   //   ],
//   //   skipDuplicates: true,
//   // });

//   // Create User Verifications
//   await prisma.userVerification.createMany({
//     data: [
//       {
//         user_id: alice.id,
//         verification_code: '123456',
//         created_at: new Date('2025-05-07T11:05:00Z'),
//         expired_at: new Date('2025-05-08T11:05:00Z'),
//       },
//       {
//         user_id: bob.id,
//         verification_code: '654321',
//         created_at: new Date('2025-05-07T11:10:00Z'),
//         expired_at: new Date('2025-05-08T11:10:00Z'),
//       },
//       {
//         user_id: carol.id,
//         verification_code: '789123',
//         created_at: new Date('2025-05-07T11:15:00Z'),
//         expired_at: new Date('2025-05-08T11:15:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create User Contacts
//   await prisma.userContact.createMany({
//     data: [
//       {
//         user_id: alice.id,
//         contact_id: bob.id,
//         first_name: 'Bob',
//         last_name: 'Johnson',
//         created_at: new Date('2025-05-07T11:20:00Z'),
//         updated_at: new Date('2025-05-07T11:20:00Z'),
//       },
//       {
//         user_id: bob.id,
//         contact_id: alice.id,
//         first_name: 'Alice',
//         last_name: 'Smith',
//         created_at: new Date('2025-05-07T11:25:00Z'),
//         updated_at: new Date('2025-05-07T11:25:00Z'),
//       },
//       {
//         user_id: alice.id,
//         contact_id: carol.id,
//         first_name: 'Carol',
//         last_name: 'Williams',
//         created_at: new Date('2025-05-07T11:30:00Z'),
//         updated_at: new Date('2025-05-07T11:30:00Z'),
//       },
//       {
//         user_id: carol.id,
//         contact_id: emma.id,
//         first_name: 'Emma',
//         last_name: 'Davis',
//         created_at: new Date('2025-05-07T11:35:00Z'),
//         updated_at: new Date('2025-05-07T11:35:00Z'),
//       },
//       {
//         user_id: emma.id,
//         contact_id: bob.id,
//         first_name: 'Bob',
//         last_name: 'Johnson',
//         created_at: new Date('2025-05-07T11:40:00Z'),
//         updated_at: new Date('2025-05-07T11:40:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create Contacts
//   await prisma.contact.createMany({
//     data: [
//       {
//         first_name: 'Frank',
//         last_name: 'Wilson',
//         phone: '+12345678906',
//         email: 'frank@example.com',
//         created_at: new Date('2025-05-07T11:45:00Z'),
//       },
//       {
//         first_name: 'Grace',
//         last_name: 'Taylor',
//         phone: '+12345678907',
//         email: 'grace@example.com',
//         created_at: new Date('2025-05-07T11:50:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create Block Lists
//   await prisma.blockList.createMany({
//     data: [
//       {
//         user_id: alice.id,
//         participant_id: david.id,
//         created_at: new Date('2025-05-07T11:55:00Z'),
//       },
//       {
//         user_id: bob.id,
//         participant_id: carol.id,
//         created_at: new Date('2025-05-07T12:00:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create Conversations
//   const groupChat = await prisma.conversation.create({
//     data: {
//       title: 'Group Chat',
//       creator_id: alice.id,
//       channel_id: 1,
//       avatar_url: 'https://example.com/group_avatar.png',
//       created_at: new Date('2025-05-07T12:05:00Z'),
//       updated_at: new Date('2025-05-07T12:05:00Z'),
//     },
//   });

//   const privateChat = await prisma.conversation.create({
//     data: {
//       title: 'Alice & Bob',
//       creator_id: bob.id,
//       channel_id: 2,
//       avatar_url: 'https://example.com/private_avatar.png',
//       created_at: new Date('2025-05-07T12:10:00Z'),
//       updated_at: new Date('2025-05-07T12:10:00Z'),
//     },
//   });

//   // Create Participants
//   await prisma.participant.createMany({
//     data: [
//       {
//         conversation_id: groupChat.id,
//         user_id: alice.id,
//         type: 'lead',
//         created_at: new Date('2025-05-07T12:15:00Z'),
//         updated_at: new Date('2025-05-07T12:15:00Z'),
//       },
//       {
//         conversation_id: groupChat.id,
//         user_id: bob.id,
//         type: 'member',
//         created_at: new Date('2025-05-07T12:20:00Z'),
//         updated_at: new Date('2025-05-07T12:20:00Z'),
//       },
//       {
//         conversation_id: groupChat.id,
//         user_id: carol.id,
//         type: 'member',
//         created_at: new Date('2025-05-07T12:25:00Z'),
//         updated_at: new Date('2025-05-07T12:25:00Z'),
//       },
//       {
//         conversation_id: groupChat.id,
//         user_id: emma.id,
//         type: 'member',
//         created_at: new Date('2025-05-07T12:30:00Z'),
//         updated_at: new Date('2025-05-07T12:30:00Z'),
//       },
//       {
//         conversation_id: privateChat.id,
//         user_id: alice.id,
//         type: 'member',
//         created_at: new Date('2025-05-07T12:35:00Z'),
//         updated_at: new Date('2025-05-07T12:35:00Z'),
//       },
//       {
//         conversation_id: privateChat.id,
//         user_id: bob.id,
//         type: 'lead',
//         created_at: new Date('2025-05-07T12:40:00Z'),
//         updated_at: new Date('2025-05-07T12:40:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create Messages
//   await prisma.message.createMany({
//     data: [
//       {
//         conversation_id: groupChat.id,
//         sender_id: alice.id,
//         message_type: 'text',
//         content: 'Hello everyone!',
//         status: 'sent',
//         call_type: 'voice',
//         callStatus: 'ENDED',
//         created_at: new Date('2025-05-07T12:45:00Z'),
//       },
//       {
//         conversation_id: groupChat.id,
//         sender_id: bob.id,
//         message_type: 'text',
//         content: 'Hi Alice!',
//         status: 'delivered',
//         call_type: 'voice',
//         callStatus: 'ENDED',
//         created_at: new Date('2025-05-07T12:50:00Z'),
//       },
//       {
//         conversation_id: groupChat.id,
//         sender_id: carol.id,
//         message_type: 'image',
//         content: 'Check this out!',
//         status: 'read',
//         call_type: 'voice',
//         callStatus: 'ENDED',
//         created_at: new Date('2025-05-07T12:55:00Z'),
//       },
//       {
//         conversation_id: groupChat.id,
//         sender_id: emma.id,
//         message_type: 'video',
//         content: 'Awesome video!',
//         status: 'sent',
//         call_type: 'video',
//         callStatus: 'MISSED',
//         created_at: new Date('2025-05-07T13:00:00Z'),
//       },
//       {
//         conversation_id: privateChat.id,
//         sender_id: bob.id,
//         message_type: 'text',
//         content: 'Hey Alice, how’s it going?',
//         status: 'read',
//         call_type: 'voice',
//         callStatus: 'ENDED',
//         created_at: new Date('2025-05-07T13:05:00Z'),
//       },
//       {
//         conversation_id: privateChat.id,
//         sender_id: alice.id,
//         message_type: 'file',
//         content: 'Here’s the document.',
//         status: 'delivered',
//         call_type: 'voice',
//         callStatus: 'ENDED',
//         created_at: new Date('2025-05-07T13:10:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create Attachments
//   const imageMessage = await prisma.message.findFirst({
//     where: { sender_id: carol.id, message_type: 'image' },
//   });
//   const videoMessage = await prisma.message.findFirst({
//     where: { sender_id: emma.id, message_type: 'video' },
//   });
//   const fileMessage = await prisma.message.findFirst({
//     where: { sender_id: alice.id, message_type: 'file' },
//   });
//   await prisma.attachment.createMany({
//     data: [
//       {
//         message_id: imageMessage.id,
//         thumb_url: 'https://example.com/thumb.jpg',
//         file_url: 'https://example.com/image.jpg',
//         created_at: new Date('2025-05-07T13:15:00Z'),
//         updated_at: new Date('2025-05-07T13:15:00Z'),
//       },
//       {
//         message_id: videoMessage.id,
//         thumb_url: 'https://example.com/video_thumb.jpg',
//         file_url: 'https://example.com/video.mp4',
//         created_at: new Date('2025-05-07T13:20:00Z'),
//         updated_at: new Date('2025-05-07T13:20:00Z'),
//       },
//       {
//         message_id: fileMessage.id,
//         thumb_url: 'https://example.com/file_thumb.png',
//         file_url: 'https://example.com/document.pdf',
//         created_at: new Date('2025-05-07T13:25:00Z'),
//         updated_at: new Date('2025-05-07T13:25:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create Deleted Messages
//   await prisma.deletedMessage.createMany({
//     data: [
//       {
//         message_id: imageMessage.id,
//         user_id: bob.id,
//         created_at: new Date('2025-05-07T13:30:00Z'),
//         updated_at: new Date('2025-05-07T13:30:00Z'),
//       },
//       {
//         message_id: videoMessage.id,
//         user_id: carol.id,
//         created_at: new Date('2025-05-07T13:35:00Z'),
//         updated_at: new Date('2025-05-07T13:35:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create Deleted Conversations
//   await prisma.deletedConversation.createMany({
//     data: [
//       {
//         conversation_id: groupChat.id,
//         user_id: david.id,
//         created_at: new Date('2025-05-07T13:40:00Z'),
//       },
//       {
//         conversation_id: privateChat.id,
//         user_id: alice.id,
//         created_at: new Date('2025-05-07T13:45:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create Reports
//   await prisma.report.createMany({
//     data: [
//       {
//         user_id: bob.id,
//         participant_id: carol.id,
//         report_type: 'spam',
//         notes: 'Inappropriate content',
//         status: 'PENDING',
//         created_at: new Date('2025-05-07T13:50:00Z'),
//       },
//       {
//         user_id: emma.id,
//         participant_id: david.id,
//         report_type: 'harassment',
//         notes: 'Offensive behavior',
//         status: 'RESOLVED',
//         created_at: new Date('2025-05-07T13:55:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create Friends
//   await prisma.friend.createMany({
//     data: [
//       {
//         requester_id: alice.id,
//         receiver_id: bob.id,
//         status: 'ACCEPTED',
//         created_at: new Date('2025-05-07T14:00:00Z'),
//       },
//       {
//         requester_id: bob.id,
//         receiver_id: carol.id,
//         status: 'PENDING',
//         created_at: new Date('2025-05-07T14:05:00Z'),
//       },
//       {
//         requester_id: carol.id,
//         receiver_id: emma.id,
//         status: 'REJECTED',
//         created_at: new Date('2025-05-07T14:10:00Z'),
//       },
//       {
//         requester_id: emma.id,
//         receiver_id: alice.id,
//         status: 'ACCEPTED',
//         created_at: new Date('2025-05-07T14:15:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   // Create Stories
//   await prisma.story.createMany({
//     data: [
//       {
//         user_id: alice.id,
//         content: 'Enjoying the day!',
//         created_at: new Date('2025-05-07T14:20:00Z'),
//         updated_at: new Date('2025-05-07T14:20:00Z'),
//         expires_at: new Date('2025-05-08T14:20:00Z'),
//       },
//       {
//         user_id: bob.id,
//         content: 'New adventure!',
//         created_at: new Date('2025-05-07T14:25:00Z'),
//         updated_at: new Date('2025-05-07T14:25:00Z'),
//         expires_at: new Date('2025-05-08T14:25:00Z'),
//       },
//       {
//         user_id: carol.id,
//         content: 'Beautiful sunset!',
//         created_at: new Date('2025-05-07T14:30:00Z'),
//         updated_at: new Date('2025-05-07T14:30:00Z'),
//         expires_at: new Date('2025-05-08T14:30:00Z'),
//       },
//       {
//         user_id: emma.id,
//         content: 'Fun times!',
//         created_at: new Date('2025-05-07T14:35:00Z'),
//         updated_at: new Date('2025-05-07T14:35:00Z'),
//         expires_at: new Date('2025-05-08T14:35:00Z'),
//       },
//     ],
//     skipDuplicates: true,
//   });

//   console.log(
//     'Seed data created successfully for all tables with additional records!',
//   );
// }

// main()
//   .catch((e) => {
//     console.error('Error seeding data:', e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
