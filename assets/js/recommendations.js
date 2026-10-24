/*
 * Local-only game recommendations.
 *
 * Nothing leaves the browser. Play counts, time played and recency are stored
 * in localStorage and used to rank games by similarity to what this visitor
 * actually plays. The more someone plays, the sharper the ranking gets.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ilf_play_history_v1';
  var CATALOG_KEY = 'ilf_game_catalog_v1';
  var MAX_RECENT = 24;

  // Hand-written tags give much better results than guessing from titles alone.
  var TAGS = {
    'pong': ['arcade', 'sports', 'tennis', '2-player', 'local-multiplayer', 'retro', 'fast', 'skill', 'keyboard', 'gamepad'],
    'timestable-balloons': ['educational', 'math', 'kids', 'arcade', 'timed', 'quick-play', 'high-score', 'touch'],
    'why-chicken-crossed': ['arcade', 'action', 'maze', 'runner', 'timing', 'kids', 'challenge', 'fast', 'touch', 'high-score'],
    'tetnis': ['puzzle', 'blocks', 'tetromino', 'arcade', 'retro', 'high-score', 'challenge', 'skill', 'touch'],
    'lawnmower-simulator': ['simulator', 'chill', 'tycoon', 'open-ended', 'collect', 'upgrade', 'casual', 'keyboard', 'touch'],
    'Block-bang': ['puzzle', 'blocks', 'match', 'arcade', 'fast', 'challenge', 'casual', 'touch'],
    'DiceRollIdleEmpires': ['idle', 'tycoon', 'dice', 'numbers', 'incremental', 'progression', 'chill', 'shop', 'upgrade', 'touch'],
    'gridbite': ['arcade', 'snake', 'grid', '2-player', 'local-multiplayer', 'fast', 'challenge', 'skill', 'keyboard', 'gamepad', 'touch', 'boost'],
    'rotaze': ['puzzle', 'maze', 'rotation', 'challenge', 'skill', 'timer', 'coins', 'shop', 'touch', 'casual'],
    'Tower-Defense': ['strategy', 'tower-defense', 'action', 'fantasy', 'waves', 'enemies', 'upgrade', 'challenge', 'touch', 'keyboard'],
    'DiceRollIdleEmpires2': ['idle', 'tycoon', 'dice', 'numbers', 'incremental', 'progression', 'chill', 'sequel', 'shop', 'upgrade'],
    'fishclimbracing': ['racing', 'action', 'fish', 'arcade', 'endless', 'coins', 'shop', 'fast', 'skill', 'touch'],
    'minetycoon': ['idle', 'tycoon', 'mining', 'clicker', 'incremental', 'progression', 'shop', 'upgrade', 'chill', 'touch'],
    'emojimatch': ['puzzle', 'memory', 'educational', 'kids', 'match', 'timer', 'chill', 'touch'],
    'fishyclicker': ['clicker', 'idle', 'fish', 'incremental', 'chill', 'casual', 'touch'],
    'fishcore': ['action', 'fish', 'arcade', 'fast', 'skill', 'challenge', 'enemies', 'upgrade', 'touch'],
    'fishtycoon': ['tycoon', 'idle', 'fish', 'management', 'progression', 'shop', 'upgrade', 'chill', 'casual', 'touch'],
    'battlefishi': ['action', 'fish', 'arcade', 'enemies', 'levels', 'fast', 'challenge', 'touch']
  };

  // Small bonus for direct sequels / sibling games.
  var SERIES = {
    'DiceRollIdleEmpires': 'dice-idle',
    'DiceRollIdleEmpires2': 'dice-idle',
    'fishyclicker': 'fish-idle',
    'fishtycoon': 'fish-idle',
    'fishcore': 'fish-action',
    'battlefishi': 'fish-action'
  };

  // Good mix for a first visit, before there is any history.
  var STARTER = [
    'pong',
    'timestable-balloons',
    'gridbite',
    'DiceRollIdleEmpires',
    'emojimatch',
    'minetycoon',
    'why-chicken-crossed',
    'fishclimbracing'
  ];

  // Deterministic fallback for the games tab when there is no history.
  var DEFAULT_ORDER = [
    'pong',
    'timestable-balloons',
    'why-chicken-crossed',
    'tetnis',
    'lawnmower-simulator',
    'Block-bang',
    'DiceRollIdleEmpires',
    'gridbite',
    'rotaze',
    'Tower-Defense',
    'DiceRollIdleEmpires2',
    'fishclimbracing',
    'minetycoon',
    'emojimatch',
    'fishyclicker',
    'fishcore',
    'fishtycoon',
    'battlefishi'
  ];

  function emptyState() {
    return { version: 2, games: {}, recent: [], streak: 0, lastPlayDay: null };
  }

  function readState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyState();
      if (!parsed.games || typeof parsed.games !== 'object') parsed.games = {};
      if (!Array.isArray(parsed.recent)) parsed.recent = [];
      if (typeof parsed.streak !== 'number') parsed.streak = 0;
      if (typeof parsed.lastPlayDay !== 'string') parsed.lastPlayDay = null;
      return parsed;
    } catch (e) {
      return emptyState();
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Private mode / quota: recommendations still work for this page view.
    }
  }

  function ensureGame(state, folder) {
    if (!state.games[folder]) {
      state.games[folder] = {
        plays: 0,
        seconds: 0,
        feedback: 0,
        streak: 0,
        lastPlayDay: null,
        days: {},
        firstPlayed: Date.now(),
        lastPlayed: 0
      };
    }
    return state.games[folder];
  }

  function dayKey(timestamp) {
    var date = timestamp ? new Date(timestamp) : new Date();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + month + '-' + day;
  }

  function getStreak() {
    var state = readState();
    var today = dayKey();
    var count = Math.max(0, Number(state.streak) || 0);

    if (!state.lastPlayDay) return { count: 0, playedToday: false };
    if (state.lastPlayDay === today) return { count: count, playedToday: true };
    if (state.lastPlayDay === dayKey(Date.now() - 86400000)) {
      return { count: count, playedToday: false };
    }
    return { count: 0, playedToday: false };
  }

  function gameStreakFromState(state, folder) {
    var game = state.games[folder];
    var today = dayKey();
    var count = game ? Math.max(0, Number(game.streak) || 0) : 0;
    if (!game || !game.lastPlayDay) return { count: 0, playedToday: false };
    if (game.lastPlayDay === today) return { count: count, playedToday: true };
    if (game.lastPlayDay === dayKey(Date.now() - 86400000)) {
      return { count: count, playedToday: false };
    }
    return { count: 0, playedToday: false };
  }

  function getGameStreak(folder) {
    return gameStreakFromState(readState(), folder);
  }

  function getGameStats(folder) {
    var state = readState();
    var history = state.games[folder];
    if (!history) return null;
    var plays = Number(history.plays) || 0;
    var seconds = Math.max(0, Number(history.seconds) || 0);
    return {
      plays: plays,
      seconds: seconds,
      averageSeconds: plays ? seconds / plays : 0,
      streak: gameStreakFromState(state, folder),
      days: history.days || {}
    };
  }

  function getGameCalendar(folder) {
    var state = readState();
    var history = state.games[folder];
    if (!history) return { days: {}, streak: { count: 0, playedToday: false } };
    return {
      days: history.days || {},
      streak: gameStreakFromState(state, folder)
    };
  }

  function recordPlay(folder) {
    if (!folder) return;
    folder = String(folder);
    var state = readState();
    var game = ensureGame(state, folder);
    game.plays += 1;
    game.lastPlayed = Date.now();
    if (!game.firstPlayed) game.firstPlayed = game.lastPlayed;

    var today = dayKey();
    if (state.lastPlayDay !== today) {
      state.streak = state.lastPlayDay === dayKey(Date.now() - 86400000)
        ? Math.max(1, Number(state.streak) || 0) + 1
        : 1;
      state.lastPlayDay = today;
    }

    if (game.lastPlayDay !== today) {
      game.streak = game.lastPlayDay === dayKey(Date.now() - 86400000)
        ? Math.max(1, Number(game.streak) || 0) + 1
        : 1;
      game.lastPlayDay = today;
    }

    if (!game.days || typeof game.days !== 'object') game.days = {};
    var playDay = game.days[today] || { plays: 0, seconds: 0 };
    playDay.plays = (Number(playDay.plays) || 0) + 1;
    playDay.seconds = Number(playDay.seconds) || 0;
    game.days[today] = playDay;

    state.recent = [folder].concat(state.recent.filter(function (item) {
      return item !== folder;
    })).slice(0, MAX_RECENT);

    writeState(state);
    try {
      document.dispatchEvent(new CustomEvent('ilf:history-changed', { detail: { folder: folder } }));
    } catch (e) { /* ignore */ }
  }

  function recordFeedback(folder, value) {
    if (!folder) return 0;
    folder = String(folder);
    var next = Math.max(-1, Math.min(1, Number(value) || 0));
    var state = readState();
    var game = ensureGame(state, folder);
    game.feedback = next;
    writeState(state);
    try {
      document.dispatchEvent(new CustomEvent('ilf:history-changed', { detail: { folder: folder, feedback: next } }));
    } catch (e) { /* ignore */ }
    return next;
  }

  function feedbackFor(folder) {
    if (!folder) return 0;
    var state = readState();
    var game = state.games[folder];
    return game ? Math.max(-1, Math.min(1, Number(game.feedback) || 0)) : 0;
  }

  function recordTime(folder, seconds) {
    if (!folder) return;
    var whole = Math.round(Number(seconds) || 0);
    if (whole < 3) return;
    if (whole > 1800) whole = 1800;

    var state = readState();
    var game = ensureGame(state, folder);
    game.seconds = (game.seconds || 0) + whole;
    game.lastPlayed = Date.now();

    if (!game.days || typeof game.days !== 'object') game.days = {};
    var today = dayKey();
    var playDay = game.days[today] || { plays: 0, seconds: 0 };
    playDay.seconds = (Number(playDay.seconds) || 0) + whole;
    playDay.plays = Math.max(1, Number(playDay.plays) || 0);
    game.days[today] = playDay;

    writeState(state);
  }

  function getHistory() {
    return readState();
  }

  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
  }

  function saveCatalog(games) {
    if (!Array.isArray(games) || !games.length) return;
    try {
      var minimal = games.map(function (game) {
        return {
          folder: game.folder,
          name: game.name,
          description: game.description || '',
          icon: game.icon || '',
          entry: game.entry || '',
          featured: !!game.featured,
          featuredOrder: game.featuredOrder
        };
      });
      localStorage.setItem(CATALOG_KEY, JSON.stringify(minimal));
    } catch (e) { /* ignore */ }
  }

  function getCatalog() {
    try {
      var raw = localStorage.getItem(CATALOG_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function nextGame(excludeFolder) {
    var games = getCatalog();
    if (!games.length) return null;
    var ranked = rank(games);
    for (var i = 0; i < ranked.length; i += 1) {
      if (ranked[i].folder !== excludeFolder) return ranked[i];
    }
    return null;
  }

  function getTags(game) {
    if (TAGS[game.folder]) return TAGS[game.folder].slice();

    var text = ((game.name || '') + ' ' + (game.description || '') + ' ' + (game.folder || '')).toLowerCase();
    var tags = [];
    var rules = [
      [/fish/, 'fish'],
      [/idle|tycoon|clicker/, 'idle'],
      [/puzzle|maze|match|block/, 'puzzle'],
      [/tower|defen[cs]e|strateg/, 'strategy'],
      [/race|racing|climb/, 'racing'],
      [/math|times table|educational/, 'educational'],
      [/snake|grid/, 'arcade'],
      [/battle|action|shoot/, 'action'],
      [/chill|simulator|relax/, 'chill'],
      [/2.?player|versus|battle/, '2-player']
    ];
    rules.forEach(function (rule) {
      if (rule[0].test(text) && tags.indexOf(rule[1]) === -1) tags.push(rule[1]);
    });
    if (!tags.length) tags.push('casual');
    return tags;
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    if (a.folder === b.folder) return 1;

    var aTags = getTags(a);
    var bTags = getTags(b);
    var intersection = 0;
    aTags.forEach(function (tag) {
      if (bTags.indexOf(tag) !== -1) intersection += 1;
    });
    var union = aTags.length + bTags.length - intersection;
    var score = union ? intersection / union : 0;

    if (SERIES[a.folder] && SERIES[a.folder] === SERIES[b.folder]) {
      score = Math.min(1, score + 0.3);
    }
    return score;
  }

  function hash(value) {
    var h = 2166136261;
    var text = String(value);
    for (var i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul ? Math.imul(h, 16777619) : ((h * 16777619) | 0);
    }
    return Math.abs(h);
  }

  function defaultOrder(games) {
    var byFolder = {};
    games.forEach(function (game) { byFolder[game.folder] = game; });
    var ordered = [];
    DEFAULT_ORDER.forEach(function (folder) {
      if (byFolder[folder]) {
        ordered.push(byFolder[folder]);
        delete byFolder[folder];
      }
    });
    games.forEach(function (game) {
      if (byFolder[game.folder]) ordered.push(game);
    });
    return ordered;
  }

  function affinityFor(games, state) {
    var byFolder = {};
    games.forEach(function (game) { byFolder[game.folder] = game; });

    var affinity = {};
    games.forEach(function (game) { affinity[game.folder] = 0; });

    var totalWeight = 0;
    var now = Date.now();

    Object.keys(state.games).forEach(function (folder) {
      var history = state.games[folder] || {};
      var plays = Number(history.plays) || 0;
      if (plays <= 0) return;

      var source = byFolder[folder] || {
        folder: folder,
        name: folder,
        description: ''
      };
      var ageDays = history.lastPlayed ? Math.max(0, (now - history.lastPlayed) / 86400000) : 999;
      var recency = 1 / (1 + ageDays / 5);
      var seconds = Math.max(0, Number(history.seconds) || 0);
      var engagement = 1 + Math.min(seconds / 600, 1.5) + Math.min(plays, 8) * 0.06;
      var weight = Math.log1p(plays) * recency * engagement;

      totalWeight += weight;
      games.forEach(function (game) {
        var sim = similarity(source, game);
        if (sim > 0) affinity[game.folder] += weight * sim;
      });
    });

    if (totalWeight > 0) {
      games.forEach(function (game) {
        affinity[game.folder] /= totalWeight;
      });
    }
    return affinity;
  }

  function feedbackBias(games, state, game) {
    var byFolder = {};
    games.forEach(function (item) { byFolder[item.folder] = item; });

    var bias = 0;
    Object.keys(state.games).forEach(function (folder) {
      var feedback = Number(state.games[folder].feedback) || 0;
      if (!feedback) return;
      var source = byFolder[folder] || { folder: folder, name: folder, description: '' };
      bias += feedback * 0.22 * similarity(source, game);
    });

    var direct = state.games[game.folder]
      ? Number(state.games[game.folder].feedback) || 0
      : 0;
    return bias + direct * 0.28;
  }

  function rankWithScores(games, state) {
    var affinity = affinityFor(games, state);
    var today = Math.floor(Date.now() / 86400000);

    return games.map(function (game) {
      var history = state.games[game.folder];
      var plays = history ? Number(history.plays) || 0 : 0;
      var played = plays > 0;
      var feedback = feedbackBias(games, state, game);
      var novelty = played ? 0 : 0.24;
      var prior = game.featured ? 0.18 : 0.03;
      var repeatPenalty = played ? 0.35 / (1 + plays * 0.8) : 1;
      var jitter = (hash(game.folder + ':' + today) % 1000) / 1000 * 0.035;
      var match = affinity[game.folder] || 0;
      var score = match * repeatPenalty + feedback + novelty + prior + jitter;
      return { game: game, score: score, affinity: match, feedback: feedback };
    }).sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.game.name || '').localeCompare(String(b.game.name || ''));
    });
  }

  function hasSignals(state) {
    if (state.recent.length) return true;
    return Object.keys(state.games).some(function (folder) {
      return Number(state.games[folder].feedback) !== 0;
    });
  }

  function rank(games) {
    if (!Array.isArray(games) || !games.length) return [];
    var state = readState();
    if (!hasSignals(state)) return defaultOrder(games);
    return rankWithScores(games, state).map(function (item) { return item.game; });
  }

  function pickDiverse(ranked, limit) {
    var picked = [];
    var tagCount = {};
    var pool = ranked.slice();

    while (picked.length < limit && pool.length) {
      var bestIndex = 0;
      var bestValue = -Infinity;

      for (var i = 0; i < pool.length; i += 1) {
        var tags = getTags(pool[i].game);
        var overlap = 0;
        tags.forEach(function (tag) { overlap += tagCount[tag] || 0; });
        var value = pool[i].score - overlap * 0.12;
        if (value > bestValue) {
          bestValue = value;
          bestIndex = i;
        }
      }

      var chosen = pool.splice(bestIndex, 1)[0];
      picked.push(chosen.game);
      getTags(chosen.game).forEach(function (tag) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    }
    return picked;
  }

  function recommended(games, limit) {
    if (!Array.isArray(games) || !games.length) return [];
    limit = Math.max(1, Number(limit) || 5);
    var state = readState();

    if (!hasSignals(state)) {
      var byFolder = {};
      games.forEach(function (game) { byFolder[game.folder] = game; });
      var starter = [];
      STARTER.forEach(function (folder) {
        if (byFolder[folder]) {
          starter.push(byFolder[folder]);
          delete byFolder[folder];
        }
      });
      defaultOrder(games).forEach(function (game) {
        if (starter.length >= limit) return;
        if (byFolder[game.folder]) {
          starter.push(game);
          delete byFolder[game.folder];
        }
      });
      return starter.slice(0, limit);
    }

    var ranked = rankWithScores(games, state);
    var notDisliked = ranked.filter(function (item) {
      var history = state.games[item.game.folder];
      return !history || Number(history.feedback) !== -1;
    });
    var unplayed = notDisliked.filter(function (item) {
      var history = state.games[item.game.folder];
      return !history || (Number(history.plays) || 0) === 0;
    });
    var pool = unplayed.length >= limit ? unplayed : notDisliked;
    if (pool.length < limit) pool = ranked;
    return pickDiverse(pool, limit);
  }

  window.ILF_RECS = {
    recordPlay: recordPlay,
    recordTime: recordTime,
    recordFeedback: recordFeedback,
    feedbackFor: feedbackFor,
    getStreak: getStreak,
    getGameStreak: getGameStreak,
    getGameStats: getGameStats,
    getGameCalendar: getGameCalendar,
    getHistory: getHistory,
    clearHistory: clearHistory,
    saveCatalog: saveCatalog,
    getCatalog: getCatalog,
    nextGame: nextGame,
    rank: rank,
    recommended: recommended,
    tagsFor: getTags
  };
})();
