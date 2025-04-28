// file: index.js
import { Telegraf, Markup } from 'telegraf';
import { config } from 'dotenv';
import { db } from './firebase.js';
import { keepAlive } from './keepAlive.js';
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';

config(); keepAlive();

const bot = new Telegraf(process.env.BOT_TOKEN);

// ✅ তোমার Telegram Admin ID বসাও
const ADMIN_ID = '6243881362';

const userSession = new Map();

// Start Command
bot.start(async (ctx) => {
  await ctx.replyWithChatAction('typing');
  setTimeout(async () => {
    await ctx.reply(✨ *Welcome to Premium Tournament Service Bot!* ✨\n\nPlease select an option:, { parse_mode: 'Markdown', ...Markup.keyboard([
      ['📱 App Order', '🌐 Website Order'],
      ['🚀 Promote App/Website', '🗂️ Order History']
    ]).resize() });
  }, 800);
});

// Menu Handlers
bot.hears('📱 App Order', (ctx) => showAppOptions(ctx));
bot.hears('🌐 Website Order', (ctx) => showWebsiteOptions(ctx));
bot.hears('🚀 Promote App/Website', (ctx) => showPromoteOptions(ctx));
bot.hears('🗂️ Order History', (ctx) => showOrderHistory(ctx));
bot.hears('Cancel', (ctx) => cancelOrder(ctx));

// App Options
async function showAppOptions(ctx) {
  userSession.set(ctx.from.id, { type: 'App Order', step: 'waiting_for_name' });
  await ctx.reply(📱 *Choose your App:*\n\n- APP-1: yourapplink.com - 2500৳\n- APP-2: yourapplink.com - 3500৳\n- APP-3: yourapplink.com - 5000৳\n- APP-4: yourapplink.com - 7000৳, {
    parse_mode: 'Markdown',
    ...Markup.keyboard([
      ['APP-1', 'APP-2'],
      ['APP-3', 'APP-4'],
      ['Next', 'Cancel']  // **Here we added Next and Cancel buttons**
    ]).resize()
  });
}

// Website Options
async function showWebsiteOptions(ctx) {
  userSession.set(ctx.from.id, { type: 'Website Order', step: 'waiting_for_name' });
  await ctx.reply(🌐 *Choose your Website:*\n\n- WEBSITE-1: yourweblink.com - 3500৳\n- WEBSITE-2: yourweblink.com - 4800৳\n- WEBSITE-3: yourweblink.com - 5900৳, {
    parse_mode: 'Markdown',
    ...Markup.keyboard([
      ['WEBSITE-1', 'WEBSITE-2'],
      ['WEBSITE-3'],
      ['Next', 'Cancel']  // **Here we added Next and Cancel buttons**
    ]).resize()
  });
}

// Promote Options
async function showPromoteOptions(ctx) {
  userSession.set(ctx.from.id, { type: 'Promotion Order', step: 'waiting_for_name' });
  await ctx.reply(🚀 *Choose Promotion Plan:*\n\n- PROMOT-1: 500 Customers - 700৳\n- PROMOT-2: 1000 Customers - 1300৳\n- PROMOT-3: 1500 Customers - 1800৳, {
    parse_mode: 'Markdown',
    ...Markup.keyboard([
      ['PROMOT-1', 'PROMOT-2'],
      ['PROMOT-3'],
      ['Next', 'Cancel']  // **Here we added Next and Cancel buttons**
    ]).resize()
  });
}

// Cancel Handler
async function cancelOrder(ctx) {
  userSession.delete(ctx.from.id);
  await ctx.reply('❌ Your order has been cancelled.', Markup.removeKeyboard());
}

// Show Order History
async function showOrderHistory(ctx) {
  const userId = ctx.from.id;
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    await ctx.reply('❌ You have no previous orders.');
  } else {
    let history = '🗂️ Your Orders:\n\n';
    snapshot.forEach(doc => {
      const data = doc.data();
      history += `• *Type:* ${data.orderType}\n• *Payment:* ${data.paymentMethod}\n• *Payment Status:* ${data.paymentStatus}\n• *Date:* ${data.timestamp.toDate().toLocaleString()}\n\n`;
    });
    await ctx.reply(history, { parse_mode: 'Markdown' });
  }
}

// Handle User Text Inputs
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSession.get(userId);

  if (!session) return;

  const text = ctx.message.text;

  if (session.step === 'waiting_for_name') {
    session.name = text;
    session.step = 'waiting_for_email';
    await ctx.reply('📧 Please enter your Email:', { parse_mode: 'Markdown' });
  } else if (session.step === 'waiting_for_email') {
    session.email = text;
    session.step = 'waiting_for_telegram';
    await ctx.reply('💬 Please enter your Telegram Number:', { parse_mode: 'Markdown' });
  } else if (session.step === 'waiting_for_telegram') {
    session.telegram = text;
    session.step = 'waiting_for_whatsapp';
    await ctx.reply('📱 Please enter your WhatsApp Number:', { parse_mode: 'Markdown' });
  } else if (session.step === 'waiting_for_whatsapp') {
    session.whatsapp = text;
    session.step = 'waiting_for_payment';
    await ctx.reply('💵 Choose Payment Method:\n\nবিকাশ: 01318645435\nনগদ: 01855966005\nরকেট: 01829261192', {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['Bkash', 'Nagad'],
        ['Rocket', 'Cash on Delivery'],
        ['Back', 'Cancel']  // **Here we added Back and Cancel buttons**
      ]).resize()
    });
  } else if (session.step === 'waiting_for_payment') {
    if (['Bkash', 'Nagad', 'Rocket', 'Cash on Delivery'].includes(text)) {
      session.paymentMethod = text;

      if (text === 'Cash on Delivery') {
        session.paymentStatus = 'Cash on Delivery';
        session.transactionId = 'N/A';
        await saveOrder(ctx, session);
      } else {
        session.paymentStatus = 'Pending';
        session.step = 'waiting_for_transaction';
        await ctx.reply('🧾 Please send your *Transaction ID* now:', { parse_mode: 'Markdown' });
      }
    } else {
      await ctx.reply('❌ Invalid Payment Method. Please select from the keyboard.');
    }
  } else if (session.step === 'waiting_for_transaction') {
    session.transactionId = text;
    session.paymentStatus = 'Paid';
    await saveOrder(ctx, session);
  }
});

// Save Order to Firestore
async function saveOrder(ctx, session) {
  const orderData = {
    userId: ctx.from.id,
    name: session.name,
    email: session.email,
    telegram: session.telegram,
    whatsapp: session.whatsapp,
    orderType: session.type,
    paymentMethod: session.paymentMethod,
    paymentStatus: session.paymentStatus,
    transactionId: session.transactionId,
    timestamp: new Date()
  };

  await addDoc(collection(db, 'orders'), orderData);

  await ctx.reply('✅ Order Confirmed!\n\nWe have received your order. Please wait for admin confirmation.', {
    parse_mode: 'Markdown',
    ...Markup.removeKeyboard()
  });

  // Send Notification to Admin
  await bot.telegram.sendMessage(ADMIN_ID, `📥 *New Order Received!*\n\n👤 *Name:* ${session.name}\n📧 *Email:* ${session.email}\n💬 *Telegram:* ${session.telegram}\n📱 *WhatsApp:* ${session.whatsapp}\n🛒 *Order Type:* ${session.type}\n💵 *Payment Method:* ${session.paymentMethod}\n📋 *Transaction ID:* ${session.transactionId}\n⚡ *Payment Status:* ${session.paymentStatus}`, { parse_mode: 'Markdown' });

  userSession.delete(ctx.from.id);
}

// Launch Bot
bot.launch();
