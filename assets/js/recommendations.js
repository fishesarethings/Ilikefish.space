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
  var MAX_RECENT = 24;

  // Hand-written tags give much better results than guessing from titles alone.
  var TAGS = {
    'pong': ['arcade', 'retro', 'sports', '2-player', 'fast', 'skill'],
    'timestable-balloons': ['educational', 'math', 'arcade', 'fast', 'kids', 'skill'],
    'why-chicken-crossed': ['arcade', 'action', 'maze', 'fast', 'challenge', 'kids'],
    'tetnis': ['puzzle', 'blocks', 'arcade', 'retro', 'challenge', 'skill'],
    'lawnmower-simulator': ['simulator', 'chill', 'tycoon', 'open-world', 'casual'],
    'Block-bang': ['puzzle', 'blocks', 'arcade', 'fast', 'challenge', 'casual'],
    'DiceRollIdleEmpires': ['idle', 'tycoon', 'dice', 'numbers', 'chill', 'casual'],
    'gridbite': ['arcade', 'snake', 'grid', 'fast', '2-player', 'challenge', 'skill'],
    'rotaze': ['puzzle', 'maze', 'challenge', 'skill', 'casual'],
    'Tower-Defense': ['strategy', 'tower-defense', 'action', 'challenge', 'fantasy'],
    'DiceRollIdleEmpires2': ['idle', 'tycoon', 'dice', 'numbers', 'chill', 'casual', 'sequel'],
    'fishclimbracing': ['racing', 'action', 'fish', 'arcade', 'fast', 'skill'],
    'minetycoon': ['idle', 'tycoon', 'mining', 'clicker', 'chill', 'casual'],
    'emojimatch': ['puzzle', 'memory', 'educational', 'kids', 'chill', 'casual'],
    'fishyclicker': ['clicker', 'idle', 'fish', 'chill', 'casual'],
    'fishcore': ['action', 'fish', 'arcade', 'fast', 'skill', 'challenge'],
    'fishtycoon': ['tycoon', 'idle', 'fish', 'chill', 'management', 'casual'],
    'battlefishi': ['action', 'fish', 'arcade', '2-player', 'fast', 'challenge']
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
    return { version: 1, games: {}, recent: [] };
  }

  function readState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyState();
      if (!parsed.games || typeof parsed.games !== 'object') parsed.games = {};
      if (!Array.isArray(parsed.recent)) parsed.recent = [];
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
        firstPlayed: Date.now(),
        lastPlayed: 0
      };
    }
    return state.games[folder];
  }

  function recordPlay(folder) {
    if (!folder) return;
    folder = String(folder);
    var state = readState();
    var game = ensureGame(state, folder);
    game.plays += 1;
    game.lastPlayed = Date.now();
    if (!game.firstPlayed) game.firstPlayed = game.lastPlayed;

    state.recent = [folder].concat(state.recent.filter(function (item) {
      return item !== folder;
    })).slice(0, MAX_RECENT);

    writeState(state);
    try {
      document.dispatchEvent(new CustomEvent('ilf:history-changed', { detail: { folder: folder } }));
    } catch (e) { /* ignore */ }
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
      var source = byFolder[folder] || {
        folder: folder,
        name: folder,
        description: ''
      };
      var ageDays = history.lastPlayed ? Math.max(0, (now - history.lastPlayed) / 86400000) : 999;
      var recency = 1 / (1 + ageDays / 5);
      var plays = Math.max(1, Number(history.plays) || 0);
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

  function rankWithScores(games, state) {
    var affinity = affinityFor(games, state);
    var today = Math.floor(Date.now() / 86400000);

    return games.map(function (game) {
      var history = state.games[game.folder];
      var played = !!history;
      var plays = played ? Math.max(1, Number(history.plays) || 1) : 0;
      var novelty = played ? 0 : 0.24;
      var prior = game.featured ? 0.18 : 0.03;
      var repeatPenalty = played ? 0.35 / (1 + plays * 0.8) : 1;
      var jitter = (hash(game.folder + ':' + today) % 1000) / 1000 * 0.035;
      var match = affinity[game.folder] || 0;
      var score = match * repeatPenalty + novelty + prior + jitter;
      return { game: game, score: score, affinity: match };
    }).sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.game.name || '').localeCompare(String(b.game.name || ''));
    });
  }

  function rank(games) {
    if (!Array.isArray(games) || !games.length) return [];
    var state = readState();
    if (!state.recent.length) return defaultOrder(games);
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
    limit = Math.max(1, Number(limit) || 8);
    var state = readState();

    if (!state.recent.length) {
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
    var unplayed = ranked.filter(function (item) { return !state.games[item.game.folder]; });
    var matched = unplayed.filter(function (item) { return item.affinity > 0.06; });
    var pool = matched.length >= Math.min(limit, 6) ? matched : unplayed;
    if (pool.length < Math.min(limit, 4)) pool = ranked;
    return pickDiverse(pool, limit);
  }

  window.ILF_RECS = {
    recordPlay: recordPlay,
    recordTime: recordTime,
    getHistory: getHistory,
    clearHistory: clearHistory,
    rank: rank,
    recommended: recommended,
    tagsFor: getTags
  };
})();
