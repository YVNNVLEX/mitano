import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

const users = new Map()
let waitingUser = null

const PAIRING_TIMEOUT = 10000 // 10 secondes

io.on("connection", (socket) => {
  console.log("Nouvelle connexion:", socket.id)

  socket.on("error", (error) => {
    console.error("Erreur de socket:", error);
  });
  
  users.set(socket.id, { state: "waiting" })

  socket.on("ready", async () => {
    console.log("Utilisateur prêt:", socket.id)

    if (waitingUser && waitingUser !== socket.id && users.get(waitingUser)?.state === "waiting") {
      const roomId = `room_${Date.now()}`

      users.set(waitingUser, { state: "pairing", roomId })
      users.set(socket.id, { state: "pairing", roomId })

      socket.join(roomId)
      io.sockets.sockets.get(waitingUser)?.join(roomId)

      io.to(roomId).emit("paired", { roomId })
      console.log(`Utilisateurs jumelés dans la room: ${roomId}`)

      // Définir un timeout pour la connexion
      setTimeout(() => {
        const user1 = users.get(waitingUser)
        const user2 = users.get(socket.id)
        if (user1?.state === "pairing" || user2?.state === "pairing") {
          console.log(`Timeout de jumelage pour la room: ${roomId}`)
          io.to(roomId).emit("pairing-timeout")
          if (user1?.state === "pairing") users.set(waitingUser, { state: "waiting" })
          if (user2?.state === "pairing") users.set(socket.id, { state: "waiting" })
          io.sockets.sockets.get(waitingUser)?.leave(roomId)
          socket.leave(roomId)
        }
      }, PAIRING_TIMEOUT)

      waitingUser = null
    } else {
      waitingUser = socket.id
      console.log("En attente d'un partenaire:", socket.id)
    }
  })

  socket.on("connection-established", () => {
    const userInfo = users.get(socket.id)
    if (userInfo?.roomId) {
      users.set(socket.id, { ...userInfo, state: "connected" })
      console.log(`Connexion établie pour l'utilisateur ${socket.id} dans la room ${userInfo.roomId}`)
    }
  })

  socket.on("offer", (data) => {
    console.log(`Offre reçue de ${socket.id}`)
    const userInfo = users.get(socket.id)
    if (userInfo?.roomId) {
      socket.to(userInfo.roomId).emit("offer", data)
    }
  })

  socket.on("answer", (data) => {
    console.log(`Réponse reçue de ${socket.id}`)
    const userInfo = users.get(socket.id)
    if (userInfo?.roomId) {
      socket.to(userInfo.roomId).emit("answer", data)
    }
  })

  socket.on("ice-candidate", (data) => {
    const userInfo = users.get(socket.id)
    if (userInfo?.roomId) {
      socket.to(userInfo.roomId).emit("ice-candidate", data)
    }
  })

  socket.on("disconnect", () => {
    const userInfo = users.get(socket.id)
    if (userInfo?.roomId) {
      socket.to(userInfo.roomId).emit("peer-disconnected")
    }

    users.delete(socket.id)
    if (waitingUser === socket.id) {
      waitingUser = null
    }

    console.log("Utilisateur déconnecté:", socket.id)
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Serveur de signalisation démarré sur le port ${PORT}`)
})

