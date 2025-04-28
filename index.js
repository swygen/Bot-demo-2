import { Telegraf, Markup } from 'telegraf';
import { config } from 'dotenv';
import { db } from './firebase.js';
import { keepAlive } from './keepAlive.js';
import { addDoc, collection } from 'firebase/firestore';

config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Keep the bot alive (for render hosting)
keepAlive();

// User session management
const userSession = new Map();

// Start Command
bot.start(async (ctx) => {
  await ctx.replyWithChatAction('typing');
  setTimeout(async () => {
    await ctx.reply(`✨ *Welcome to the Premium Tournament Service Bot!* ✨\n\nSelect an option from below:`, {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['📱 App Order', '🌐 Website Order'],
        ['🚀 Promote App/Website', '🗂️ Order History']
      ])
        .resize()
        .oneTime()
    });
  }, 1000);
});

// Handle Menu Options
bot.hears('📱 App Order', (ctx) => showAppOptions(ctx));
bot.hears('🌐 Website Order', (ctx) => showWebsiteOptions(ctx));
bot.hears('🚀 Promote App/Website', (ctx) => showPromoteOptions(ctx));
bot.hears('🗂️ Order History', (ctx) => showOrderHistory(ctx));

// Show App options
async function showAppOptions(ctx) {
  await ctx.replyWithChatAction('typing');
  setTimeout(async () => {
    await ctx.reply(`📱 *Choose an App for Order:*\n\n- APP-1: yourapplink.com - Price: 2500\n- APP-2: yourapplink.com - Price: 3500\n- APP-3: yourapplink.com - Price: 5000\n- APP-4: yourapplink.com - Price: 7000`, {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['APP-1', 'APP-2'],
        ['APP-3', 'APP-4'],
        ['Cancel']
      ])
        .resize()
        .oneTime()
    });
  }, 700);
}

// Show Website options
async function showWebsiteOptions(ctx) {
  await ctx.replyWithChatAction('typing');
  setTimeout(async () => {
    await ctx.reply(`🌐 *Choose a Website for Order:*\n\n- WEBSITE-1: yourweblink.com - Price: 3500\n- WEBSITE-2: yourweblink.com - Price: 4800\n- WEBSITE-3: yourweblink.com - Price: 5900`, {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['WEBSITE-1', 'WEBSITE-2'],
        ['WEBSITE-3'],
        ['Cancel']
      ])
        .resize()
        .oneTime()
    });
  }, 700);
}

// Show Promote options
async function showPromoteOptions(ctx) {
  await ctx.replyWithChatAction('typing');
  setTimeout(async () => {
    await ctx.reply(`🚀 *Choose a Promotion Plan:*\n\n- PROMOT-1: 500 Targeted Customers - Price: 700\n- PROMOT-2: 1000 Targeted Customers - Price: 1300\n- PROMOT-3: 1500 Targeted Customers - Price: 1800`, {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['PROMOT-1', 'PROMOT-2'],
        ['PROMOT-3'],
        ['Cancel']
      ])
        .resize()
        .oneTime()
    });
  }, 700);
}

// Handle Order History
async function showOrderHistory(ctx) {
  const userId = ctx.from.id;
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    await ctx.reply('❌ You have no previous orders.');
  } else {
    let historyText = '🗂️ *Your Order History:*\n\n';
    querySnapshot.forEach(doc => {
      const order = doc.data();
      historyText += `• Order Type: ${order.orderType}\n• Date: ${order.timestamp.toDate().toLocaleString()}\n\n`;
    });
    await ctx.reply(historyText, { parse_mode: 'Markdown' });
  }
}

// User input for Order Details
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSession.get(userId);

  if (!session) return;

  const text = ctx.message.text;

  if (session.step === 'waiting_for_name') {
    session.name = text;
    session.step = 'waiting_for_email';
    await ctx.reply('📧 Please enter your *Email*:');
  } else if (session.step === 'waiting_for_email') {
    session.email = text;
    session.step = 'waiting_for_telegram';
    await ctx.reply('💬 Please enter your *Telegram Number*:');
  } else if (session.step === 'waiting_for_telegram') {
    session.telegram = text;
    session.step = 'waiting_for_whatsapp';
    await ctx.reply('📱 Please enter your *WhatsApp Number*:');
  } else if (session.step === 'waiting_for_whatsapp') {
    session.whatsapp = text;
    session.step = 'completed';

    // Save order details to Firebase
    const order = {
      userId,
      name: session.name,
      email: session.email,
      telegram: session.telegram,
      whatsapp: session.whatsapp,
      orderType: session.type,
      timestamp: new Date()
    };

    await addDoc(collection(db, 'orders'), order);
    await ctx.reply('✅ *Order Confirmed!*\n\nThank you for your order. Please wait for confirmation.');
    userSession.delete(userId);
  }
});

// Start the bot
bot.launch();
