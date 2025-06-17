import { AccountRole, DeviceType, MessageType, CallStatus, CallType, MessageStatus, ParticipantType, FriendStatus, ReportStatus, ParticipantStatus } from "@prisma/client";

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

class SecutiryUtils {
  static async hashingPassword(password) {
    const SALT_OR_ROUNDS = 10;
    return await bcrypt.hash(password, SALT_OR_ROUNDS);
  }
}

const prisma = new PrismaClient();

// Helper function to generate random enum value
function getRandomEnumValue(enumObj: any) {
  const values = Object.values(enumObj);
  return values[Math.floor(Math.random() * values.length)];
}

// Helper function to generate random user data
function generateUserData(index: number, role: AccountRole = AccountRole.USER) {
  return {
    email: `user${index}@user${index}.com`,
    phone: `123456789${index}`,
    password: `useruser`,
    role: role,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    middle_name: faker.person.middleName(),
    level_left: faker.number.int({ min: 0, max: 5 }),
    level_right: faker.number.int({ min: 0, max: 5 }),
    is_active: true,
    is_blocked: false,
    preferences: JSON.stringify({
      theme: faker.helpers.arrayElement(['light', 'dark']),
      notifications: faker.datatype.boolean(),
      language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de']),
    }),
  };
}

export async function seedData() {
  // Create admin users
  const adminUsers = [
    {
      email: 'admin@admin.com',
      phone: '1234567890',
      password: 'admin@admin.com',
      role: AccountRole.ADMIN,
      first_name: 'Admin',
      last_name: 'User',
      level_left: 0,
      level_right: 1,
      is_active: true,  
      is_blocked: false,
    },
    {
      email: 'superadmin@admin.com',
      phone: '1234567891',
      password: 'superadmin@admin.com',
      role: AccountRole.ADMIN,
      first_name: 'Super',
      last_name: 'Admin',
      level_left: 1,
      level_right: 2,
      is_active: true,
      is_blocked: false,
    },
  ];

  // Create regular users
  const regularUsers = Array.from({ length: 10 }, (_, i) => generateUserData(i + 2));

  // Combine all users
  const allUsers = [...adminUsers, ...regularUsers];

  // Create users and store their IDs
  const userIds = [];
  for (const userData of allUsers) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { phone: userData.phone }
        ]
      }
    });

    if (!existingUser) {
      const hashedPassword = await SecutiryUtils.hashingPassword(userData.password);
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        }
      });
      userIds.push(user.id);
      console.log(`Created user: ${userData.email}`);
    } else {
      userIds.push(existingUser.id);
      console.log(`User already exists: ${userData.email}`);
    }
  }

  // Create Devices for each user
  console.log('Creating devices...');
  const deviceIds = [];
  for (const userId of userIds) {
    const deviceTypes = [DeviceType.ANDROID, DeviceType.IOS, DeviceType.WEB];
    for (const deviceType of deviceTypes) {
      const device = await prisma.device.create({
        data: {
          device_code: `DEV-${faker.string.uuid().substring(0, 8)}`,
          device_token: faker.string.uuid(),
          type: deviceType,
        },
      });
      deviceIds.push(device.id);

      // Create access record for each device
      await prisma.access.create({
        data: {
          user_id: userId,
          device_id: device.id,
          token: faker.string.uuid(),
          is_deleted: faker.datatype.boolean(),
        },
      });
    }
  }

  // Create User Verifications
  console.log('Creating user verifications...');
  for (const userId of userIds) {
    const existingVerification = await prisma.userVerification.findUnique({
      where: { user_id: userId }
    });

    if (!existingVerification) {
      await prisma.userVerification.create({
        data: {
          user_id: userId,
          verification_code: faker.string.numeric(6),
          created_at: new Date(),
          expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          type: faker.helpers.arrayElement(['AUTHENTICATION', 'CHANGE_PASSWORD']),
        },
      });
    } else {
      console.log(`Verification already exists for user: ${userId}`);
    }
  }

  // Create Conversations
  console.log('Creating conversations...');
  const conversationIds = [];
  for (let i = 0; i < 5; i++) {
    const conversation = await prisma.conversation.create({
      data: {
        title: faker.lorem.words(3),
        creator_id: faker.helpers.arrayElement(userIds),
        channel_id: faker.number.int({ min: 1, max: 5 }),
        avatar_url: faker.image.avatar(),
      },
    });
    conversationIds.push(conversation.id);
  }

  // Create Participants for each conversation
  console.log('Creating participants...');
  for (const conversationId of conversationIds) {
    const numParticipants = faker.number.int({ min: 2, max: 5 });
    const selectedUserIds = faker.helpers.arrayElements(userIds, numParticipants);
    
    for (let i = 0; i < selectedUserIds.length; i++) {
      await prisma.participant.create({
        data: {
          conversation_id: conversationId,
          user_id: selectedUserIds[i],
          type: i === 0 ? ParticipantType.LEAD : ParticipantType.MEMBER,
          status: i === 0 ? ParticipantStatus.VERIFIED : ParticipantStatus.UNVERIFIED,
        },
      });
    }
  }

  // Create Messages
  console.log('Creating messages...');
  for (const conversationId of conversationIds) {
    const numMessages = faker.number.int({ min: 5, max: 20 });
    for (let i = 0; i < numMessages; i++) {
      const message = await prisma.message.create({
        data: {
          guid: faker.string.uuid(),
          conversation_id: conversationId,
          sender_id: faker.helpers.arrayElement(userIds),
          message_type: faker.helpers.arrayElement(Object.values(MessageType)),
          content: faker.lorem.sentence(),
          call_type: faker.helpers.arrayElement(Object.values(CallType)),
          call_status: faker.helpers.arrayElement(Object.values(CallStatus)),
          message_status: faker.helpers.arrayElement(Object.values(MessageStatus)),
        },
      });

      // Create attachments for some messages
      if (faker.datatype.boolean()) {
        await prisma.attachment.create({
          data: {
            message_id: message.id,
            thumb_url: faker.image.url(),
            file_url: faker.internet.url(),
          },
        });
      }
    }
  }

  // Create Friend relationships
  console.log('Creating friend relationships...');
  for (const userId of userIds) {
    const numFriends = faker.number.int({ min: 1, max: 5 });
    const potentialFriends = userIds.filter(id => id !== userId);
    const selectedFriends = faker.helpers.arrayElements(potentialFriends, numFriends);

    for (const friendId of selectedFriends) {
      // Check if friendship already exists in either direction
      const existingFriendship = await prisma.friend.findFirst({
        where: {
          OR: [
            { requester_id: userId, receiver_id: friendId },
            { requester_id: friendId, receiver_id: userId }
          ]
        }
      });

      if (!existingFriendship) {
        await prisma.friend.create({
          data: {
            requester_id: userId,
            receiver_id: friendId,
            status: faker.helpers.arrayElement(Object.values(FriendStatus)),
          },
        });
      } else {
        console.log(`Friendship already exists between users ${userId} and ${friendId}`);
      }
    }
  }

  // Create Reports
  console.log('Creating reports...');
  for (const userId of userIds) {
    const numReports = faker.number.int({ min: 0, max: 3 });
    const potentialReported = userIds.filter(id => id !== userId);
    const selectedReported = faker.helpers.arrayElements(potentialReported, numReports);

    for (const reportedId of selectedReported) {
      // Check if report already exists
      const existingReport = await prisma.report.findFirst({
        where: {
          user_id: userId,
          participant_id: reportedId
        }
      });

      if (!existingReport) {
        await prisma.report.create({
          data: {
            user_id: userId,
            participant_id: reportedId,
            report_type: faker.helpers.arrayElement(['Inappropriate Content', 'Harassment', 'Spam', 'Other']),
            notes: faker.lorem.sentence(),
            status: faker.helpers.arrayElement(Object.values(ReportStatus)),
            rejected_reason: faker.datatype.boolean() ? faker.lorem.sentence() : null,
          },
        });
      } else {
        console.log(`Report already exists from user ${userId} for user ${reportedId}`);
      }
    }
  }

  // Create Block List entries
  console.log('Creating block list entries...');
  for (const userId of userIds) {
    if (faker.datatype.boolean()) {
      const potentialBlocked = userIds.filter(id => id !== userId);
      const blockedId = faker.helpers.arrayElement(potentialBlocked);

      // Check if block already exists
      const existingBlock = await prisma.blockList.findFirst({
        where: {
          user_id: userId,
          participant_id: blockedId
        }
      });

      if (!existingBlock) {
        await prisma.blockList.create({
          data: {
            user_id: userId,
            participant_id: blockedId,
          },
        });
      } else {
        console.log(`Block already exists from user ${userId} for user ${blockedId}`);
      }
    }
  }

  // Create Stories
  console.log('Creating stories...');
  const storyIds = [];
  for (const userId of userIds) {
    const numStories = faker.number.int({ min: 0, max: 3 });
    for (let i = 0; i < numStories; i++) {
      const story = await prisma.story.create({
        data: {
          user_id: userId,
          content: faker.lorem.sentence(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
        },
      });
      storyIds.push(story.id);
    }
  }

  // Create Story Likes
  console.log('Creating story likes...');
  for (const storyId of storyIds) {
    const numLikes = faker.number.int({ min: 0, max: 5 });
    const selectedLikers = faker.helpers.arrayElements(userIds, numLikes);

    for (const userId of selectedLikers) {
      // Check if like already exists
      const existingLike = await prisma.storyLike.findUnique({
        where: {
          story_id_user_id: {
            story_id: storyId,
            user_id: userId
          }
        }
      });

      if (!existingLike) {
        await prisma.storyLike.create({
          data: {
            story_id: storyId,
            user_id: userId,
          },
        });
      } else {
        console.log(`Like already exists for story ${storyId} from user ${userId}`);
      }
    }
  }

  // Create Story Comments
  console.log('Creating story comments...');
  for (const storyId of storyIds) {
    const numComments = faker.number.int({ min: 0, max: 5 });
    const selectedCommenters = faker.helpers.arrayElements(userIds, numComments);

    for (const userId of selectedCommenters) {
      await prisma.storyComment.create({
        data: {
          story_id: storyId,
          user_id: userId,
          content: faker.lorem.sentence(),
        },
      });
    }
  }

  // Create Deleted Messages
  console.log('Creating deleted messages...');
  const messages = await prisma.message.findMany();
  for (const message of messages) {
    if (faker.datatype.boolean()) {
      const userId = faker.helpers.arrayElement(userIds);
      // Check if deletion record already exists
      const existingDeletion = await prisma.deletedMessage.findFirst({
        where: {
          message_id: message.id,
          user_id: userId
        }
      });

      if (!existingDeletion) {
        await prisma.deletedMessage.create({
          data: {
            message_id: message.id,
            user_id: userId,
          },
        });
      } else {
        console.log(`Message deletion record already exists for message ${message.id} by user ${userId}`);
      }
    }
  }

  // Create Deleted Conversations
  console.log('Creating deleted conversations...');
  for (const conversationId of conversationIds) {
    if (faker.datatype.boolean()) {
      const userId = faker.helpers.arrayElement(userIds);
      // Check if deletion record already exists
      const existingDeletion = await prisma.deletedConversation.findFirst({
        where: {
          conversation_id: conversationId,
          user_id: userId
        }
      });

      if (!existingDeletion) {
        await prisma.deletedConversation.create({
          data: {
            conversation_id: conversationId,
            user_id: userId,
          },
        });
      } else {
        console.log(`Conversation deletion record already exists for conversation ${conversationId} by user ${userId}`);
      }
    }
  }

  console.log('Seed data created successfully!');
}

export default async function runSeedData() {
  return seedData() 
    .catch((e) => {
      console.error('Error seeding data:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
