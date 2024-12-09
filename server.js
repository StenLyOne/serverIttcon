import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";

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

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/api/contacts", async (req, res) => {
  try {
    const newContact = new Contact(req.body);
    await newContact.save();
    res.status(201).send("Данные успешно сохранены!");
  } catch (err) {
    console.error("Ошибка сохранения данных:", err);
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

app.get("/", (req, res) => {
  res.send("Сервер работает!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
