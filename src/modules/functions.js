import config from "./config";
import state from "./state";
import { ONE_MINUTE } from "./constants";
import Message from "../classes/Message";
import ELEMENTS from "../data/elements";
import { rightClick, leftClick, dblClick, keyPress } from "./events";
import { start as startUpdater, stop as stopUpdater } from "./updater";
import { applySettingsToChat } from "./settings";
import {
  start as startRecentChatters,
  stop as stopRecentChatters,
  update as updateRecentChatters,
} from "./recent-chatters";
import observers from "./observers";

export const existsInUserList = (list, userId) => {
  const users = config.get(list);
  if (!users.length) return false;
  return users.some((user) => user.id === userId);
};

export const modifyUserList = (list, user, toggle) => {
  const users = config.get(list);
  let newUsers = false;
  let userExists = false;

  if (users.length) {
    userExists = users.some((listUser) => listUser.id === user.id);
  }

  if (toggle) {
    if (!userExists) {
      // Add
      newUsers = [
        ...users,
        {
          id: user.id,
          displayName: user.displayName,
          color: user.color,
        },
      ];
      toast(`${user.displayName} added to ${list} list`, "success");
    } else {
      toast(`${user.displayName} is already in ${list} list`, "error");
      return false;
    }
  } else {
    if (userExists) {
      // Remove
      newUsers = users.filter((listUser) => listUser.id !== user.id);
      toast(`${user.displayName} removed from ${list} list`, "success");
    } else {
      toast(`${user.displayName} is not in ${list} list`, "error");
      return false;
    }
  }

  if (!newUsers) {
    toast(`${user.displayName} could not be added to ${list} list`, "error");
    return false;
  }

  config.set(list, newUsers);
  config.save();
  applySettingsToChat();
  return true;
};

export const capitalize = (str) => {
  return str.replace(/^\w/, (c) => c.toUpperCase());
};

export const getElementText = (element, childSelector = false) => {
  let text = false;

  if (typeof element === "string") {
    element = document.querySelector(element);
  }

  if (!element) {
    return false;
  }

  element = childSelector ? element.querySelector(childSelector) : element;

  if (typeof element.textContent !== undefined) {
    text = element.textContent;
  } else if (typeof element.innerText !== undefined) {
    text = element.innerText;
  } else if (typeof element.innerHTML !== undefined) {
    text = element.innerHTML;
  }
  return text ? text : false;
};

export const toggleDenseChat = () => {
  const chatInner = document.querySelector(ELEMENTS.chat.list.selector);

  chatInner.classList.toggle(
    "maejok-dense-chat",
    config.get("enableDenseChat")
  );
};

export const toggleBigChat = (mode = null, muted = false) => {
  if (config.get("enableBigChat")) {
    if (!muted) {
      playSound("shutter");
    }

    mode = mode === null ? !config.get("bigChatState") : mode;
  } else {
    mode = false;
  }

  config.set("bigChatState", mode);
  config.save();

  const getElement = (elm) => document.querySelector(elm.selector);
  const elements = {
    chat: getElement(ELEMENTS.chat.main),
    presence: getElement(ELEMENTS.chat.header.presence),
    chat_count: getElement(ELEMENTS.chat.header.recent),
    room_select: getElement(ELEMENTS.chat.room),
    header: getElement(ELEMENTS.header),
    user: getElement(ELEMENTS.header.user),
    admin: getElement(ELEMENTS.header.title.admin),
    logo: getElement(ELEMENTS.header.title.logo),
    links: getElement(ELEMENTS.header.title.links),
    invite: getElement(ELEMENTS.profile.clanInvite),
    experience: getElement(ELEMENTS.experience),
    countdown: getElement(ELEMENTS.countdown),
  };

  const prefix = "maejok-chat_mode-";
  Object.keys(elements).forEach((className) => {
    const element = elements[className];
    if (element) {
      element.classList.toggle(prefix + className, mode);
    }
  });

  elements.countdown?.classList.remove(
    "maejok-chat-countdown-hide",
    "maejok-chat-countdown-show"
  );
  elements.countdown?.classList.toggle(
    config.get("hideCountdown")
      ? "maejok-chat-countdown-hide"
      : "maejok-chat-countdown-show",
    mode
  );
};

export const toggleDimMode = (enable) => {
  const overlay = document.querySelector(".maejok-dim-mode");
  if (enable && !overlay) {
    const home = document.querySelector("#__next");
    const newOverlay = document.createElement("div");
    newOverlay.classList.add("maejok-dim-mode");
    home.appendChild(newOverlay);
  } else if (!enable && overlay) {
    overlay.remove();
  }
};

export const mentionUser = (displayName) => {
  if (typeof displayName === "object") displayName = displayName.displayName;
  setChatInputValue(`@${displayName}`, false);
  playSound("click-high-short");
};

export const getMessageType = (element) => {
  const classes = {
    message: ELEMENTS.chat.message.class,
    emote: ELEMENTS.chat.emote.class,
    clan: ELEMENTS.chat.clan.class,
    system: ELEMENTS.chat.system.class,
    consumable: ELEMENTS.chat.consumable.class,
  };

  const conditions = new Map([
    [
      "message",
      hasClass(element, classes.message) ||
        closestWithClass(element, classes.message),
    ],
    [
      "emote",
      hasClass(element, classes.emote) ||
        closestWithClass(element, classes.emote),
    ],
    [
      "clan",
      hasClass(element, classes.clan) ||
        closestWithClass(element, classes.clan),
    ],
    [
      "system",
      hasClass(element, classes.system) ||
        closestWithClass(element, classes.system),
    ],
    [
      "consumable",
      hasClass(element, classes.consumable) ||
        closestWithClass(element, classes.consumable),
    ],
  ]);

  let result = null;

  conditions.forEach((condition, type) => {
    if (condition) {
      result = type;
    }
  });

  return result;
};

export const getUserFromChat = (element) => {
  const messageType = getMessageType(element);

  if ((messageType !== "message" && messageType !== "emote") || !element) {
    return;
  }

  const selector = ELEMENTS.chat[messageType];

  const messageElement = closestWithClass(element, selector.class);

  const senderElement = messageElement.querySelector(selector.sender.selector);

  if (!senderElement || !messageElement) {
    return;
  }

  const sender = getElementText(senderElement);
  const displayName = cleanDisplayName(sender);
  const displayNameColor = senderElement.style.color || "rgb(255, 255, 255)";

  const id = messageElement.hasAttribute("data-user-id")
    ? messageElement.getAttribute("data-user-id")
    : null;

  const user = { displayName, id, color: displayNameColor };
  return user;
};

export const findUserByName = (displayName) => {
  const messages = document.querySelectorAll(ELEMENTS.chat.message.selector);
  const messagesArray = Array.from(messages);

  let user = false;
  messagesArray.some((node) => {
    const message = new Message(node);
    const sender = message.sender;
    const messageType = message.type;
    message.destroy();

    if (messageType !== "message") {
      return false;
    }

    if (sender.displayName === displayName) {
      user = sender;
      return true;
    }
  });

  return user;
};

export const findNearestRelative = (element, className) => {
  let currentElement = element;

  if (!currentElement) {
    return;
  }

  if (currentElement.classList?.contains(className)) {
    return currentElement;
  }

  if (currentElement.parentElement.classList.contains(className)) {
    return currentElement.parentElement;
  }
  // Check siblings
  while (
    currentElement.nextElementSibling ||
    currentElement.previousElementSibling
  ) {
    if (
      currentElement.nextElementSibling &&
      currentElement.nextElementSibling.classList.contains(className)
    ) {
      return currentElement.nextElementSibling;
    }

    if (
      currentElement.previousElementSibling &&
      currentElement.previousElementSibling.classList.contains(className)
    ) {
      return currentElement.previousElementSibling;
    }

    currentElement = currentElement.parentElement; // Move up to the parent
  }

  // Check children
  const childElements = Array.from(element.children);
  for (const child of childElements) {
    if (child.classList.contains(className)) {
      return child;
    }
  }

  return null; // No matching relative element found
};

export const cleanDisplayName = (displayName) => {
  if (typeof displayName === "object") displayName = displayName.displayName;
  return displayName.replace(/\[[^\]]+\]/, "").trim();
};

export const setChatInputValue = (value, replace = true) => {
  const input = document.querySelector(ELEMENTS.chat.input.selector);
  if (!replace)
    value = input.innerHTML
      ? `${input.innerHTML} ${value}&nbsp;`
      : `${value}&nbsp;`;
  input.innerHTML = value;
  input.dispatchEvent(new KeyboardEvent("input", { bubbles: true }));
  setCursorPosition(input);
};

export const scrollToBottom = () => {
  const chat = document.querySelector(ELEMENTS.chat.list.selector);
  chat.scrollTop = chat.scrollHeight;
};

export const processChatMessage = (node) => {
  const cfg = config.get();
  const message = new Message(node);

  processMentions(message);
  checkRoomChange(node);

  const msgHideTypes = {
    emote: "hideEmotes",
    system: "hideSystem",
    clan: "hideClanMessages",
    consumable: "hideConsumables",
    roll: "hideDiceRolling",
  };

  if (cfg[msgHideTypes[message.type]] && cfg.enablePlugin) {
    message.hide();
  } else {
    message.show();

    const messageHideMap = {
      hideTimestamps: {
        element: "timestamp",
        hide: cfg.enablePlugin ? cfg.hideTimestamps : false,
      },
      hideClans: {
        element: "clan",
        hide: cfg.enablePlugin ? cfg.hideClans : false,
      },
      hideAvatars: {
        element: "avatar",
        hide: cfg.enablePlugin ? cfg.hideAvatars : false,
      },
      hideLevels: {
        element: "level",
        hide: cfg.enablePlugin ? cfg.hideLevels : false,
      },
    };

    const hideTypes = Object.entries(messageHideMap).reduce(
      (acc, [, data]) => {
        acc.element.push(data.element);
        acc.hide.push(data.hide);
        return acc;
      },
      { element: [], hide: [] }
    );

    message.normalizeEpic();
    message.normalizeGrand();

    message.hideElements(hideTypes.element, hideTypes.hide);

    message.highlightMessage();

    updateRecentChatters(message.sender);
  }

  message.destroy();
};

export const getMinutesAgo = (timestamp) => {
  const minutes = Math.round((Date.now() - timestamp) / (1000 * 60));
  if (minutes < 1) {
    return "less than a minute ago";
  } else {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
};

export const uuid = () => {
  const array = new Uint16Array(8);
  window.crypto.getRandomValues(array);
  return Array.from(array, (num) => num.toString(16)).join("");
};

export const getHighestZIndex = () => {
  let maxZIndex = 0;
  const elements = document.getElementsByTagName("*");

  for (let i = 0; i < elements.length; i++) {
    const zIndex = window
      .getComputedStyle(elements[i])
      .getPropertyValue("z-index");

    if (!isNaN(zIndex) && zIndex !== "auto") {
      const intZIndex = parseInt(zIndex, 10);
      if (intZIndex > maxZIndex) {
        maxZIndex = intZIndex;
      }
    }
  }

  return maxZIndex;
};

/**
 * Plays a given sound
 * @param {string} sound - Name of sound to play
 */
export const playSound = (sound) => {
  const audio = document.createElement("audio");
  audio.style.display = "none";
  const sounds = new Map([
    //long
    ["doom", "mp3"],
    ["vomit", "mp3"],
    ["romantic", "mp3"],
    ["massacre", "mp3"],
    ["breakup", "mp3"],
    ["fart", "mp3"],
    ["raid", "mp3"],
    //short
    ["equip", "mp3"],
    ["denied", "mp3"],
    ["chunk-short", "mp3"],
    ["blip", "mp3"],
    ["book", "mp3"],
    ["click-high-short", "mp3"],
    ["click-low-short", "mp3"],
    ["xp", "mp3"],
    ["level", "mp3"],
    ["mention", "mp3"],
    ["click-harsh-short", "wav"],
    ["swap-short", "wav"],
    ["shutter", "wav"],
    ["complete", "wav"],
    ["xp-down", "wav"],
    ["power", "wav"],
    ["daily", "wav"],
    ["item-found", "wav"],
    ["item-consumed", "wav"],
    ["panic", "wav"],
    ["poll", "wav"],
    ["tick-short", "wav"],
    ["granted", "mp3"],
  ]);
  const ext = sounds.get(sound);
  if (ext) {
    audio.volume = 0.5;
    audio.src = `https://www.fishtank.live/sounds/${sound}.${ext}`;
    document.body.appendChild(audio);
    audio.onended = () => {
      audio.remove();
    };
    audio.play();
  } else {
    console.warn(`Sound '${sound}' not found`, "error");
  }
};

/**
 * Checks element for a class
 * @param {Element} element
 * @param {String/Array} className
 * @returns boolean
 */
export const hasClass = (element, className) => {
  if (Array.isArray(className)) {
    return className.some((classItem) =>
      element?.classList?.contains(classItem)
    );
  }

  return element?.classList?.contains(className) || false;
};

export const getUserFromLocalStorage = () => {
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.includes("cached-profile")) {
      return JSON.parse(localStorage.getItem(key)).value;
    }
  }
};

export const areObjectsEqual = (obj1, obj2) => {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
};

export const openProfile = async (userId) => {
  const data = await fetchFromFishtank(
    "get",
    `https://www.fishtank.live/api/user/get?uid=${userId}`
  );

  const modal = new CustomEvent("modalopen", {
    detail: JSON.stringify({
      modal: "Profile",
      data: data.profile,
    }),
  });
  document.dispatchEvent(modal);
};

export const muteUser = async (user) => {
  openProfile(user.id);
  let i = 0;
  const muteInterval = setInterval(() => {
    const muteButton = document.querySelector(
      ELEMENTS.profile.actions.mute.selector
    );

    if (muteButton) {
      clearInterval(muteInterval);
      muteButton.click();
    } else if (i > 200) {
      clearInterval(muteInterval);
      playSound("denied");
    }

    i++;
  }, 10);
};

export const runUserAgreement = () => {
  const VERSION = GM_info.script.version;
  const needsToAgree =
    config.get("agreementVersion") !== GM_info.script.version;

  if (!needsToAgree) {
    return true;
  }

  const message =
    '\nMAEJOK-TOOLS AGREEMENT:\n\nBy using MAEJOK-TOOLS you understand that this plugin is NOT endorsed nor promoted by Fishtank.live or its creators, may cause issues with the Fishtank.live webiste and alters the intended user experience for Fishtank.live; therefore, any bugs or issues created by use of this plugin does not the concern of Fishtank.live or its creators.\n\nIf you have any issues with the Fishtank.live website while using this plugin, you agree to FULLY disable this plugin from within your userscript plugin manager before making any bug reports to Fishtank.live staff.\n\nAny questions or bug reports in regards to MAEJOK-TOOLS are to be directed at @maejok only.\n\nIf you understand and agree, type "I agree" below to continue.';

  const agreement = prompt(message);

  if (agreement.toLowerCase() === "i agree") {
    config.set("agreementVersion", VERSION);
    config.save();

    setTimeout(() => {
      window.location.reload();
    }, 500);

    return false;
  } else {
    const refuseMessage =
      "You did not accept the MAEJOK-TOOLS usage agreement\nMAEJOK-TOOLS will not be started.\nDisable or remove MAEJOK-TOOLS from your userscript plugin (GreaseMonkey, Tampermonkey, etc) to disable this alert.";

    alert(refuseMessage);

    return false;
  }
};

export const startMaejokTools = async () => {
  config.load();
  const cfg = config.get();
  const isPopoutChat = state.get("isPopoutChat");

  if (cfg.enableRecentChatters) {
    startRecentChatters();
  }

  applySettingsToChat();
  observers.chat.start();

  const clanTag = state.get("user").clan;
  if (cfg.autoClanChat && clanTag !== null && !isPopoutChat) {
    enterChat("autoClanChat");
  }

  if (cfg.persistBigChat && !isPopoutChat) {
    toggleBigChat(cfg.bigChatState, cfg.bigChatState);
  }

  if (!isPopoutChat) {
    startUpdater();
    updateDaysUntilSeasonTwo();

    const daysLeftInterval = setInterval(() => {
      updateDaysUntilSeasonTwo();
    }, ONE_MINUTE);

    state.set("daysLeftInterval", daysLeftInterval);
  }

  const main = document.querySelector("main");

  main.addEventListener("click", leftClick);
  main.addEventListener("contextmenu", rightClick);
  main.addEventListener("dblclick", dblClick);
  document.addEventListener("keydown", keyPress);

  state.set("running", true);
};

export const stopMaejokTools = () => {
  toggleBigChat(false);

  observers.chat.stop();
  observers.user.stop();

  stopRecentChatters();
  stopUpdater();

  clearInterval(state.get("updateCheckInterval"));
  clearInterval(state.get("daysLeftInterval"));
  state.set("updateCheckInterval", null);
  state.set("daysLeftInterval", null);

  const chat = document.querySelector(ELEMENTS.chat.list.selector);
  const home = document.querySelector(ELEMENTS.home.selector);

  home.removeEventListener("click", leftClick);
  home.removeEventListener("contextmenu", rightClick);
  chat.removeEventListener("dblclick", dblClick);
  document.removeEventListener("keydown", keyPress);

  state.set("running", false);
};

async function fetchFromFishtank(method, endpoint) {
  let data = null;
  let domain = getDomainName(endpoint);

  const authKey = "sb-wcsaaupukpdmqdjcgaoo-auth-token";
  const authToken =
    domain === "fishtank" ? getCookie(authKey).raw : getCookie(authKey).decoded;

  const Authorization =
    domain === "supabase" ? `Bearer ${getCookie(authKey).decoded}` : null;

  const Cookie = `${authKey}=${authToken}`;
  const AnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjc2FhdXB1a3BkbXFkamNnYW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODkxMDM4NDEsImV4cCI6MjAwNDY3OTg0MX0.xlZdK9HhTCF_fZgq8k5DCPhxJ2vhMCW1q9du4f0ZtWE";

  const options = {
    method: method.toUpperCase(),
    headers: { ApiKey: AnonKey, Cookie, Authorization },
  };

  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const contentType = response.headers.get("Content-Type");

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (Array.isArray(data)) {
      return data[0];
    } else {
      return data;
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

function toast(message = "default message", type = "info", duration = 5000) {
  const toast = new CustomEvent("toastopen", {
    detail: JSON.stringify({
      type, // success, error, info, warning
      message,
      duration,
      id: uuid(),
    }),
  });
  document.dispatchEvent(toast);
}

function updateDaysUntilSeasonTwo() {
  const remoteData = state.get("remoteData");

  if (!remoteData?.s2ts) {
    return;
  }

  const targetDate = new Date(remoteData.s2ts * 1000);
  const targetDateNY = targetDate.toLocaleString("en-US", {
    timeZone: "America/New_York",
  });

  const currentDate = new Date();
  const currentDateNY = currentDate.toLocaleString("en-US", {
    timeZone: "America/New_York",
  });

  if (currentDate >= targetDate) {
    clearInterval(state.get("daysLeftInterval"));
    return;
  }

  const differenceMs = new Date(targetDateNY) - new Date(currentDateNY);
  const daysRemaining = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));

  const setDaysRemaining = (selector, daysRemaining) => {
    const dayElement = document.querySelector(selector);
    if (dayElement) {
      dayElement.textContent = `-${daysRemaining}`;
    }
  };
  const setDaysRemainingLabel = (selector) => {
    const labelElement = document.querySelector(selector);
    if (labelElement) {
      labelElement.textContent = `Days Left`;
    }
  };
  const day = ELEMENTS.stats.day;

  setDaysRemaining(day.selector1, daysRemaining);
  setDaysRemaining(day.selector2, daysRemaining);
  setDaysRemainingLabel(day.label.selector1);
  setDaysRemainingLabel(day.label.selector2);
}

function closestWithClass(element, classNames) {
  return element.closest(`.${classNames.split(" ").join(", .")}`) || false;
}

function getCookie(cookieName) {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(cookieName + "=")) {
      const str = cookie.substring(cookieName.length + 1);
      return { raw: str, decoded: JSON.parse(decodeURIComponent(str))[0] };
    }
  }
  return false;
}

function getDomainName(url) {
  try {
    const parsedUrl = new URL(url);
    const hostParts = parsedUrl.hostname.split(".");
    const domainName = hostParts.slice(-2, -1).join(".");
    return domainName;
  } catch (error) {
    console.error("Invalid URL:", error.message);
    return null;
  }
}

function enterChat(destination = "Global") {
  destination =
    destination === "autoClanChat" ? getUserInfo("clan") : destination;

  const rooms = document.querySelectorAll(
    `${ELEMENTS.chat.room.options.selector} button span`
  );

  rooms.forEach((room) => {
    if (room.innerText === destination) room.click();
  });
}

function getUserInfo(property) {
  const element = document.querySelector(
    ELEMENTS.header.user[property].selector
  );
  const value = element.innerText;

  if (property === "level" && value) {
    return value.replace("LVL ", "");
  }

  return value;
}

function setCursorPosition(target) {
  let range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(false);
  let selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  target.focus();
}

function checkRoomChange(node) {
  const message = node.querySelector(`${ELEMENTS.chat.system.selector} div`);
  if (message) {
    if (message.textContent.includes("Joined ")) {
      updateRecentChatters();
    }
  }
}

function processMentions(message) {
  const cfg = config.get();

  if (message.type !== "message") {
    return;
  }

  if (message.mentioned && cfg.enableMentionLog) {
    state.set("mentions", [...state.get("mentions"), { ...message }]);
  }
}
