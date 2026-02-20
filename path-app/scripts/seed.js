const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { initDb, getDb } = require('../db');

initDb();
const db = getDb();

const defaultPassword = 'path123';
const hash = bcrypt.hashSync(defaultPassword, 10);

const names = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Sophia', 'Elijah', 'Isabella', 'Lucas',
  'Mia', 'Mason', 'Charlotte', 'Ethan', 'Amelia', 'James', 'Harper', 'Alexander', 'Evelyn', 'Benjamin',
  'Abigail', 'William', 'Emily', 'Henry', 'Ella', 'Sebastian', 'Scarlett', 'Jack', 'Grace', 'Aiden',
  'Chloe', 'Owen', 'Victoria', 'Samuel', 'Riley', 'Matthew', 'Aria', 'Joseph', 'Lily', 'Levi',
  'Aubrey', 'Mateo', 'Zoey', 'David', 'Penelope', 'John', 'Layla', 'Wyatt', 'Nora', 'Daniel',
  'Camila', 'Carter', 'Hannah', 'Luke', 'Lillian', 'Grayson', 'Addison', 'Isaac', 'Eleanor', 'Julian',
  'Natalie', 'Anthony', 'Luna', 'Dominic', 'Savannah', 'Aaron', 'Brooklyn', 'Hunter', 'Leah', 'Christian',
  'Zoe', 'Landon', 'Stella', 'Adrian', 'Hazel', 'Connor', 'Ellie', 'Isaiah', 'Paisley', 'Thomas',
  'Audrey', 'Ryan', 'Skylar', 'Nathan', 'Violet', 'Charles', 'Claire', 'Caleb', 'Bella', 'Josiah',
  'Aurora', 'Colton', 'Lucy', 'Jordan', 'Anna', 'Jeremiah', 'Samantha', 'Nicholas', 'Caroline', 'Eli'
];

db.users.length = 0;
db.moments.length = 0;
db.friends.length = 0;
db.comments.length = 0;
db.reactions.length = 0;

for (let i = 0; i < 100; i++) {
  db.users.push({
    id: i + 1,
    email: `user${i + 1}@path.local`,
    password_hash: hash,
    name: names[i % names.length] + ' ' + (i + 1),
    avatar_url: null,
    cover_url: null,
    bio: null,
    created_at: new Date().toISOString(),
  });
}

const momentTypes = ['wake_up', 'eat', 'music', 'movie', 'thought', 'sleep', 'exercise', 'travel', 'photo', 'book'];
const bodies = {
  wake_up: ['Good morning world', 'Up and at em', ''],
  eat: ['Brunch with friends', 'Coffee and croissant', 'Dinner was amazing'],
  music: ['Listening to my playlist', 'Concert tonight!', ''],
  movie: ['Watching a classic', 'Movie night', ''],
  thought: ['Feeling grateful today', 'What a day.', ''],
  sleep: ['Good night', 'Off to bed', ''],
  exercise: ['Morning run', 'Gym session', ''],
  travel: ['Exploring the city', 'Trip of a lifetime', ''],
  photo: ['Sunset', 'Best day ever', ''],
  book: ['Reading something good', "Can't put this down", '']
};

let momentId = 1;
for (let i = 0; i < 200; i++) {
  const userId = 1 + Math.floor(Math.random() * 100);
  const type = momentTypes[Math.floor(Math.random() * momentTypes.length)];
  const options = bodies[type] || [''];
  const body = options[Math.floor(Math.random() * options.length)] || null;
  const created = new Date();
  created.setDate(created.getDate() - Math.floor(Math.random() * 14));
  created.setHours(created.getHours() - Math.floor(Math.random() * 12));
  db.moments.push({
    id: momentId++,
    user_id: userId,
    type,
    body,
    image_url: null,
    created_at: created.toISOString(),
  });
}

for (let i = 1; i <= 100; i++) {
  const numFriends = 5 + Math.floor(Math.random() * 15);
  const pool = Array.from({ length: 100 }, (_, j) => j + 1).filter(id => id !== i);
  const shuffled = pool.sort(() => Math.random() - 0.5);
  for (let f = 0; f < Math.min(numFriends, shuffled.length); f++) {
    const friendId = shuffled[f];
    if (!db.friends.some(x => x.user_id === i && x.friend_id === friendId)) {
      db.friends.push({ user_id: i, friend_id: friendId });
      db.friends.push({ user_id: friendId, friend_id: i });
    }
  }
}

db.save();

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const fams = [{ id: 1, name: 'Seed Fam', created_by: 1, created_at: new Date().toISOString() }];
const famMembers = [];
for (let i = 1; i <= 100; i++) {
  famMembers.push({ fam_id: 1, user_id: i, invited_by: null, joined_at: new Date().toISOString() });
}
fs.writeFileSync(path.join(dataDir, 'fams.json'), JSON.stringify(fams, null, 2));
fs.writeFileSync(path.join(dataDir, 'fam_members.json'), JSON.stringify(famMembers, null, 2));
fs.writeFileSync(path.join(dataDir, 'fam_invites.json'), JSON.stringify([], null, 2));

console.log('Seeded 100 users (password for all: path123), sample moments, friends, and one fam (Seed Fam) with all users.');
console.log('Example logins: user1@path.local … user100@path.local');
