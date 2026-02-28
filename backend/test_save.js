require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const Chat = require('./models/Chat');

mongoose.connect(process.env.MONGO_URI, {}).then(async () => {
    let chat = new Chat({
        user: new mongoose.Types.ObjectId(),
        title: "Test 1",
        messages: []
    });

    chat.messages.push({ text: "Hello", isBot: false });
    await chat.save();

    chat.messages.push({ text: "Hi bot", isBot: true });
    await chat.save();

    console.log("Chat saved successfully with 2 saves! " + chat._id);
    process.exit(0);
}).catch(err => {
    console.error("Error occurred:", err);
    process.exit(1);
});
