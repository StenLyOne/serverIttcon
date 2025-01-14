import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
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
    res.status(200).json(contacts); // Отправляем их в ответе
  } catch (err) {
    console.error("Ошибка получения данных:", err);
    res.status(500).send("Ошибка сервера");
  }
});

app.get("/", (req, res) => {
  res.send("Сервер работает!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
