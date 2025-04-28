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

// Item Data (with Price)
const items = {
  app: [
    { name: "APP-1", link: "yourapplink.com", price: 2500 },
    { name: "APP-2", link: "yourapplink.com", price: 3500 },
    { name: "APP-3", link: "yourapplink.com", price: 5000 },
    { name: "APP-4", link: "yourapplink.com", price: 7000 }
  ],
  website: [
    { name: "WEBSITE-1", link: "yourwevlink.com", price: 3500 },
    { name: "WEBSITE-2", link: "yourweblink.com", price: 4800 },
    { name: "WEBSITE-3", link: "yourweblink.com", price: 5900 }
  ],
  promote: [
    { name: "PROMOT-1", target: "500 TARGETED CUSTOMER", price: 700 },
    { name: "PROMOT-2", target: "1000 TARGETED CUSTOMER", price: 1300 },
    { name: "PROMOT-3", target: "1500 TARGETED CUSTOMER", price: 1800 }
  ]
};

// Start Command with Premium Plus Icon and Professional Frontend
bot.start(async (ctx) => {
  await ctx.replyWithChatAction('typing');
  setTimeout(async () => {
    await ctx.reply(`✨ *Welcome to the Professional Premium Bot!* ✨\n\nChoose an option below:`, {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['📱 App Order', '🌐 Website Order'],
        ['🚀 Promote App/Website', '🗂️ Order History']
      ])
        .resize()
        .extra(),
    });
  }, 1000);
});

// Handle Menu Options
bot.hears('📱 App Order', (ctx) => handleSelection(ctx, 'app'));
bot.hears('🌐 Website Order', (ctx) => handleSelection(ctx, 'website'));
bot.hears('🚀 Promote App/Website', (ctx) => handleSelection(ctx, 'promote'));
bot.hears('🗂️ Order History', (ctx) => handleHistory(ctx));

// Handle Selection for App, Website, Promote
async function handleSelection(ctx, type) {
  const userId = ctx.from.id;
  userSession.set(userId, { step: 'waiting_for_selection', type });

  const itemList = items[type]
    .map(item => `${item.name} - ${item.link} Price: ${item.price}`)
    .join('\n');

  await ctx.replyWithChatAction('typing');
  setTimeout(() => {
    ctx.reply(
      `🛒 Select an option below:\n\n${itemList}\n\nPlease type the name or number of the item you'd like to order.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(
          items[type].map(item => Markup.button.callback(item.name, item.name))
        ).extra()
      }
    );
  }, 700);
}

// Handle User Text Input for Item Selection
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSession.get(userId);

  if (!session) return;

  const text = ctx.message.text;

  // Selection Step
  if (session.step === 'waiting_for_selection') {
    const selectedItem = items[session.type].find(item => item.name === text || item.price.toString() === text);

    if (!selectedItem) {
      await ctx.reply('❌ Invalid selection. Please select a valid item.');
      return;
    }

    session.selectedItem = selectedItem;
    session.step = 'waiting_for_name';

    await ctx.reply(
      `You selected *${selectedItem.name}* - Price: ${selectedItem.price}\n\nPlease enter your *Full Name*:`,
      { parse_mode: 'Markdown' }
    );
  } 

  // Handle User Information Input
  else if (session.step === 'waiting_for_name') {
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
      itemName: session.selectedItem.name,
      itemPrice: session.selectedItem.price,
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
        historyText += `• *Type:* ${data.orderType}\n*Item:* ${data.itemName} - Price: ${data.itemPrice}\n*Date:* ${data.timestamp.toDate().toLocaleString()}\n\n`;
      });
      ctx.reply(historyText, { parse_mode: 'Markdown' });
    }
  }, 800);
}

bot.launch();
