function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '[]');
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function login() {
  const u = document.getElementById('u').value.trim();
  const p = document.getElementById('p').value.trim();
  const msg = document.getElementById('msg');

  if (!u || !p) {
    if (msg) {
      msg.classList.add('error');
      msg.textContent = 'Enter username and password.';
    } else {
      alert('Enter username and password.');
    }
    return;
  }

  const users = getUsers();
  const found = users.find(user => user.username === u && user.password === p);
  if (!found) {
    if (msg) {
      msg.classList.add('error');
      msg.textContent = 'Invalid username or password.';
    } else {
      alert('Invalid username or password.');
    }
    return;
  }

  localStorage.setItem('loggedUser', u);
  window.location.href = 'dashboard.html';
}

function registerUser() {
  const u = document.getElementById('u').value.trim();
  const p = document.getElementById('p').value.trim();
  const msg = document.getElementById('msg');

  if (!u || !p) {
    if (msg) {
      msg.classList.add('error');
      msg.textContent = 'Enter username and password.';
    } else {
      alert('Enter username and password.');
    }
    return;
  }

  const users = getUsers();
  if (users.some(user => user.username === u)) {
    if (msg) {
      msg.classList.add('error');
      msg.textContent = 'Username already exists.';
    } else {
      alert('Username already exists.');
    }
    return;
  }

  users.push({ username: u, password: p });
  saveUsers(users);

  if (msg) {
    msg.classList.remove('error');
    msg.classList.add('success');
    msg.textContent = 'Registered successfully. You can login now.';
  } else {
    alert('Registered successfully. You can login now.');
  }
}

function logout() {
  localStorage.removeItem('loggedUser');
  window.location.href = 'login.html';
}

function requireLogin() {
  const logged = localStorage.getItem('loggedUser');
  if (!logged) {
    window.location.href = 'login.html';
  }
}

function setActiveNav(page) {
  const map = { dashboard: 'nav-dashboard', chart: 'nav-chart', records: 'nav-records' };
  Object.values(map).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  const id = map[page];
  const active = document.getElementById(id);
  if (active) active.classList.add('active');
}