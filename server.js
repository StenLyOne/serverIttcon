import express from "express";
import mongoose, { mongo } from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "cloudinary";
dotenv.config();

mongoose.connect(
  "mongodb+srv://StenLyOne:Stenone123@cluster0.wrnb2wd.mongodb.net/contactsDB?retryWrites=true&w=majority",
  {}
);

const db = mongoose.connection;
db.on("error", (err) => {
  console.error("Ошибка подключения к MongoDB:", err);
});

db.once("open", () => {
  console.log("Подключено к MongoDB");
});

const contactSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  country: String,
  problems: String,
  about: String,
});

const Contact = mongoose.model("Contact", contactSchema);

const newsSchema = new mongoose.Schema({
  title: String,
  content: String,
  images: [String],
  date: { type: Date, default: Date.now },
});

const News = mongoose.model("News", newsSchema);

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: "news-images",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.GMAIL_USER, // Ваш Gmail
    pass: process.env.GMAIL_PASS, // Пароль приложения
  },
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/api/contacts", async (req, res) => {
  try {
    // Сохраняем контакт в базе данных
    const newContact = new Contact(req.body);
    await newContact.save();

    try {
      // Настройки для отправки письма
      const mailOptions = {
        from: process.env.GMAIL_USER, // Отправитель
        to: "info@ittcon.eu", // Получатель
        subject: "New contact was added",
        text: `
          New contact was added:
          Name: ${newContact.firstName} ${newContact.lastName}
          Email: ${newContact.email}
          Country: ${newContact.country}
          Problem: ${newContact.problems}
          About: ${newContact.about}
        `,
      };

      // Отправляем письмо
      await transporter.sendMail(mailOptions);
      console.log("Письмо успешно отправлено");
    } catch (emailError) {
      // Логируем ошибку, но приложение продолжает работать
      console.error("Ошибка при отправке письма:", emailError.message);
    }

    // Отправляем ответ клиенту, даже если письмо не отправлено
    res.status(201).send("Данные успешно сохранены!");
  } catch (dbError) {
    // Логируем ошибку, если произошла проблема с базой данных
    console.error("Ошибка сохранения данных:", dbError.message);
    res.status(500).send("Ошибка сервера");
  }
});

app.put("/api/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedContact = await Contact.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.status(200).json(updatedContact);
  } catch (err) {
    console.error("Ошибка обновления данных:", err);
    res.status(500).send("Ошибка сервера");
  }
});

// Удалить данные
app.delete("/api/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Contact.findByIdAndDelete(id);
    res.status(200).send("Контакт успешно удалён");
  } catch (err) {
    console.error("Ошибка удаления данных:", err);
    res.status(500).send("Ошибка сервера");
  }
});

app.get("/api/contacts", async (req, res) => {
  try {
    const contacts = await Contact.find(); // Получаем все контакты из базы данных
    const total = await Contact.countDocuments();

    const formattedContacts = contacts.map((contact) => ({
      id: contact._id.toString(), // Меняем _id на id
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      country: contact.country,
      problems: contact.problems,
      about: contact.about,
    }));

    res.set(
      "Content-Range",
      `contacts 0-${formattedContacts.length - 1}/${total}`
    );
    res.set("Access-Control-Expose-Headers", "Content-Range");

    res.status(200).json(formattedContacts);
  } catch (err) {
    console.error("Ошибка получения данных:", err);
    res.status(500).send("Ошибка сервера");
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const news = await News.find().sort({ date: -1 });
    const total = await News.countDocuments();

    // Преобразуем _id → id, чтобы React Admin понимал формат
    const formattedNews = news.map((item) => ({
      id: item._id.toString(), // Меняем _id на id
      title: item.title,
      content: item.content,
      images: item.images,
      date: item.date,
    }));

    res.set("Content-Range", `news 0-${formattedNews.length - 1}/${total}`);
    res.set("Access-Control-Expose-Headers", "Content-Range");

    res.status(200).json(formattedNews);
  } catch (err) {
    console.error("News request error:", err);
    res.status(500).send("Server error");
  }
});

app.post("/api/news", upload.array("images", 5), async (req, res) => {
  try {
    const imageUrls = processUploadedImages(req);
    const newNews = new News({ ...req.body, images: imageUrls });
    await newNews.save();
    res.status(200).json(newNews);
  } catch (err) {
    console.error("Ошибка добавления новости:", err);
    res.status(500).send("Server error");
  }
});

app.put("/api/news/:id", upload.array("images", 5), async (req, res) => {
  try {
    const imageUrls = processUploadedImages(req);
    const updatedFields = { ...req.body };

    if (imageUrls.length) {
      updatedFields.$push = { images: { $each: imageUrls } };
    }

    const updatedNews = await News.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true }
    );

    res.status(200).json(updatedNews);
  } catch (err) {
    console.error("Ошибка обновления новости:", err);
    res.status(500).send("Server error");
  }
});

app.delete("/api/news/:id", async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (news.images.length > 0) {
      for (const image of news.images) {
        const match = image.match(/\/([^/]+)\.[^.]+$/);
        if (match) {
          const publicId = match[1];
          await cloudinary.v2.uploader.destroy(publicId);
        }
      }
    }
    await News.findByIdAndDelete(req.params.id);
    res.status(200).send("News deleted");
  } catch (err) {
    console.error("Error deleting news:", err);
    res.status(500).send("Server error");
  }
});

app.get("/", (req, res) => {
  res.send("Сервер работает!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
