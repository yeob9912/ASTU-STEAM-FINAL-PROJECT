# 🎓 University Student Complaint & Issue Tracking System  
### 🚀 Full-Stack AI-Powered Complaint Management Platform (MERN + RAG)

A modern full-stack web application developed to digitalize complaint management for **University Students**.

This system integrates **React, Node.js, Express, MongoDB**, and **Retrieval-Augmented Generation (RAG)** to provide structured workflow, analytics, and intelligent AI assistance.

---

## 📌 Problem Statement

University students face various campus-related issues such as:

- 🏢 Dormitory maintenance problems  
- 🧪 Laboratory equipment malfunction  
- 🌐 Internet connectivity issues  
- 🏫 Classroom facility damage  

The traditional complaint handling process lacks:

- Structured tracking  
- Transparency  
- Real-time updates  
- Data-driven monitoring  
- Intelligent assistance  

This project introduces a centralized digital ticket management system to solve these challenges.

---

## 🎯 Project Objectives

- Enable students to submit and track complaints  
- Provide structured ticket workflow  
- Allow departments to manage assigned issues  
- Provide admin analytics dashboard  
- Integrate AI chatbot using RAG  
- Ensure transparency and accountability  

---

## 🛠 Tech Stack

### 🎨 Frontend
- **Framework**: React.js (Vite)
- **Styling**:  CSS 
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts

### ⚙ Backend
- **Server**: Node.js & Express
- **Database**: MongoDB & Mongoose
- **LLM/AI**: @google/generative-ai (Gemini)
- **Search**: MongoDB Atlas Vector Search (for RAG)
- **Processing**: Mammoth.js, PDF-Parse, Multer

---

## 👥 System Roles

### 🎓 Student
- Submit complaints  
- Upload files/images  
- Track complaint status  
- View complaint history  
- Interact with AI chatbot  

### 🏢 Department Staff
- View assigned complaints  
- Update ticket status (Open → In Progress → Resolved)  
- Add remarks  

### 🛠 Admin
- Manage users  
- Manage departments/categories  
- Monitor all complaints  
- View analytics dashboard  

---

## 🚀 Core Features

### 🔐 Role-Based Authentication
Secure login and authorization using role-based access control.

### 📝 Complaint Submission
- Structured form  
- Category-based selection  
- File upload support  

### 📌 Ticket Workflow

Each complaint follows a structured lifecycle:

- Open  
- In Progress  
- Resolved  

### 🤖 AI Chatbot with RAG

Unlike traditional chatbots, this system uses Retrieval-Augmented Generation (RAG):

1. User query is converted into embeddings  
2. MongoDB Vector Search retrieves relevant documents  
3. Retrieved context is sent to the language model  
4. AI generates context-aware response  

**Benefits:**
- Context-aware answers  
- Reduced hallucination  
- Institution-specific knowledge  
- Intelligent complaint guidance  

### 📊 Analytics Dashboard
- Total complaints  
- Most common issue types  
- Resolution rate  
- Department performance tracking  

### 📩 Notification System
- In-app notifications  
- Real-time status updates  

---

## 🔄 System Workflow

1. Student submits complaint  
2. Complaint is stored in MongoDB  
3. Assigned department staff views complaint  
4. Staff updates status and adds remarks  
5. Admin monitors performance via dashboard  
6. Student receives resolution notification  

---

## 🧠 System Architecture Overview

Frontend (React)  
⬇  
Backend API (Node.js + Express)  
⬇  
MongoDB Database  
⬇  
Vector Search Layer  
⬇  
RAG AI Pipeline  
---

## 🌟 Why This Project Stands Out

- Real-world university problem solution  
- Full-stack MERN implementation  
- Role-based system design  
- Integrated AI with RAG  
- Production-ready structured workflow  
- Data-driven analytics  

---

## 🔮 Future Enhancements

- AI-based automatic complaint classification  
- Mobile application version  
- SMS notification integration  
- Predictive analytics for recurring issues  
- Real-time chat between staff and students  

---

## 👨💻 Developer

**Yehwala Obssi**  
Computer Science & Engineering Student  

---


