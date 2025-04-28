// index.js
import { Telegraf, Markup } from 'telegraf';
import { config } from 'dotenv';
import { keepAlive } from './keepAlive.js';
import { db } from './firebase.js';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Keep alive server
keepAlive();

// User Session Memory
const userSession = new Map();

// Start Command
bot.start(async (ctx) => {
  await ctx.replyWithChatAction('typing');
  setTimeout(async () => {
    await ctx.reply(`✨ *Welcome to the Tournament Service Bot!* ✨\n\nSelect an option from below:`, {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['📱 App Order', '🌐 Website Order'],
        ['🚀 Promote App/Website', '🗂️ Order History']
      ]).resize()
    });
  }, 1000);
});

// Handle Menu Options
bot.hears('📱 App Order', (ctx) => handleOrder(ctx, 'App'));
bot.hears('🌐 Website Order', (ctx) => handleOrder(ctx, 'Website'));
bot.hears('🚀 Promote App/Website', (ctx) => handleOrder(ctx, 'Promote'));
bot.hears('🗂️ Order History', (ctx) => handleHistory(ctx));

// Order Process
async function handleOrder(ctx, type) {
  const userId = ctx.from.id;
  userSession.set(userId, { step: 'waiting_for_name', type });

  await ctx.replyWithChatAction('typing');
  setTimeout(() => {
    ctx.reply(`📝 Please enter your *Full Name*:`, { parse_mode: 'Markdown' });
  }, 700);
}

// Handle User Text Input
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSession.get(userId);

  if (!session) return;

  const text = ctx.message.text;

  if (session.step === 'waiting_for_name') {
    session.name = text;
    session.step = 'waiting_for_email';
    await ctx.reply('📧 Please enter your *Email*:', { parse_mode: 'Markdown' });

  } else if (session.step === 'waiting_for_email') {
    session.email = text;
    session.step = 'waiting_for_telegram';
    await ctx.reply('💬 Please enter your *Telegram Number*:', { parse_mode: 'Markdown' });

  } else if (session.step === 'waiting_for_telegram') {
    session.telegram = text;
    session.step = 'waiting_for_whatsapp';
    await ctx.reply('📱 Please enter your *WhatsApp Number*:', { parse_mode: 'Markdown' });

  } else if (session.step === 'waiting_for_whatsapp') {
    session.whatsapp = text;
    session.step = 'completed';

    // Save to Firebase
    const currentTime = new Date();
    await addDoc(collection(db, "orders"), {
      userId,
      name: session.name,
      email: session.email,
      telegram: session.telegram,
      whatsapp: session.whatsapp,
      orderType: session.type,
      timestamp: currentTime
    });

    await ctx.replyWithChatAction('typing');
    setTimeout(() => {
      ctx.reply('✅ *Order Confirmed!*\n\nThank you for your order. Please wait for confirmation.', { parse_mode: 'Markdown' });
    }, 1000);

    userSession.delete(userId);
  }
});

// Handle Order History
async function handleHistory(ctx) {
  const userId = ctx.from.id;
  const q = query(collection(db, "orders"), where("userId", "==", userId));

  await ctx.replyWithChatAction('typing');
  setTimeout(async () => {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      ctx.reply('❌ No order history found.');
    } else {
      let historyText = '🗂️ *Your Order History:*\n\n';
      querySnapshot.forEach(doc => {
        const data = doc.data();
        historyText += `• *Type:* ${data.orderType}\n*Date:* ${data.timestamp.toDate().toLocaleString()}\n\n`;
      });
      ctx.reply(historyText, { parse_mode: 'Markdown' });
    }
  }, 800);
}

bot.launch();
