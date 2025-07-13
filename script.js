
const socket = io();
let room = '';
let username = '';
let localStream;
let peerConnection;

const messageInput = document.getElementById('messageInput');
const messages = document.getElementById('messages');
const chatBox = document.getElementById('chatBox');
const usersList = document.getElementById('usersList');

const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

function joinRoom() {
  room = document.getElementById('roomInput').value;
  username = document.getElementById('usernameInput').value;
  if (!room || !username) return alert('Enter both room and name');

  socket.emit('join', { room, username });
  chatBox.style.display = 'block';

  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      localStream = stream;
      document.getElementById('localVideo').srcObject = stream;
    });
}

function sendMessage() {
  const msg = messageInput.value;
  if (msg) {
    socket.emit('message', { room, username, msg });
    messageInput.value = '';
  }
}

socket.on('message', ({ username, msg }) => {
  const div = document.createElement('div');
  div.textContent = username + ': ' + msg;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

socket.on('users', (users) => {
  usersList.innerHTML = users.join(', ');
});

socket.on('offer', async ({ offer }) => {
  peerConnection = new RTCPeerConnection(configuration);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    document.getElementById('remoteVideo').srcObject = event.streams[0];
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', { room, answer });
});

socket.on('answer', ({ answer }) => {
  peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', ({ candidate }) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(configuration);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = ({ candidate }) => {
    if (candidate) {
      socket.emit('ice-candidate', { room, candidate });
    }
  };

  peerConnection.ontrack = (event) => {
    document.getElementById('remoteVideo').srcObject = event.streams[0];
  };

  peerConnection.createOffer()
    .then(offer => {
      peerConnection.setLocalDescription(offer);
      socket.emit('offer', { room, offer });
    });
}

socket.on('ready', () => {
  createPeerConnection();
});

const picker = new EmojiButton();
document.getElementById('emojiBtn').addEventListener('click', () => {
  picker.togglePicker(document.getElementById('emojiBtn'));
});
picker.on('emoji', emoji => {
  messageInput.value += emoji;
});
