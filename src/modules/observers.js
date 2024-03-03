import state from "./state";
import { processChatMessage, getElementText } from "./functions";
import ELEMENTS from "../data/elements";
import config from "./config";

const observers = {
  chat: {
    start: () => {
      state.get("observers").chat?.disconnect();

      const chat = document.querySelector(ELEMENTS.chat.list.selector);

      const chatObserver = new MutationObserver((mutations) => {
        console.log(mutations)
        mutations.forEach((mutation) => {
          if (
            mutation.type !== "childList" ||
            mutation.addedNodes.length === 0
          ) {
            return;
          }

          mutation.addedNodes.forEach((addedNode) => {
            processChatMessage(addedNode);
          });
        });
      });

      chatObserver.observe(chat, { childList: true });

      state.set("observers", { ...state.get("observers"), chat: chatObserver });
    },

    stop: () => {
      const observers = state.get("observers");
      observers.chat?.disconnect();
    },
  },

  modal: {
    start: () => {
      state.get("observers").modal?.disconnect();

      const nextElement = document.getElementById("__next");
      const toastLogStyle = "color: white; margin-top: 10px; margin-bottom: 10px;";
      const toastExclusionPattern = /(level|item|mission)/

      const bodyObserver = new MutationObserver(async (mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type !== "childList" ||
            mutation.addedNodes.length === 0
          ) {
            return;
          }

          mutation.addedNodes.forEach((addedNode) => {
            if (addedNode.innerHTML.includes("Application error:")) {
              addedNode.innerHTML =
                addedNode.innerHTML +
                `<div style="background-color: rgba(0,0,0,0.5); padding: 10px; width: 775px; line-height: 1em; color: red; font-weight: 900; font-size: 2em; text-shadow: 0 0 3px maroon">MAEJOK-TOOLS NOTICE</div><div style="background-color: rgba(0,0,0,0.5); width: 775px; color: #ff7b7b; font-weight: 900; padding: 10px; text-shadow: 0 0 6px black">Something happened and the site crashed...<br/><br/>Please, for the love of everything holy, DISABLE MAEJOK-TOOLS AND CONFIRM THE PLUGIN IS NOT THE CAUSE OF THE ERROR *BEFORE* MAKING ANY BUG REPORTS<br/><br/>If the error no longer exists after disabling the plugin, <a href="https://github.com/maejok-xx/maejok-tools/issues" target="_blank" style="color: #4747ff;">report the bug on GitHub</a> Or by  <a href="https://twitter.com/maejok" target="_blank" style="color: #4747ff;">contacting @maejok</a><br/><br/>However, if, AND ONLY IF, the error persists after fully disabling MAEJOK-TOOLS from within your UserScript extension, you may report the bug on <a href="https://discord.gg/fishtankislive" target="_blank" style="color: #4747ff;">Fishcord</a><br/><br/>DO NOT <u><b>UNDER ANY CIRCUMSTANCE</u></b> CONTACT WES, JET, FISHTANK STAFF OR ANYONE ELSE ABOUT A BUGS CAUSED BY MAEJOK-TOOLS!</div>`;
            }

            if (addedNode.id === "modal" && config.get("hideGlobalMissions")) {
              const title = getElementText(ELEMENTS.modal.title.text.selector);
              if (title && title.includes("Global Mission")) {
                addedNode.setAttribute("style", "display: none !important");
              }
            }

            if (config.get("enableEventsLog") && addedNode.className.includes("toast")) {
              const toast = addedNode.querySelector(".toast_message__l35K3");

              console.log(toast.textContent);
              console.log(toast.innerText);
              console.log(getElementText(toast));
              const toastText = getElementText(toast);
              const toastTextDowncase = toastText.toLowerCase();

              if (toastExclusionPattern.test(toastTextDowncase)) {
                return;
              }
              const wrapper = document.createElement("div");
              wrapper.innerText = toastText;
              wrapper.style.cssText = toastLogStyle;
              console.log(wrapper.innerHTML);
              console.log(wrapper.outerHTML);


              state.set("events", [
                ...state.get("events"),
                { html: wrapper.outerHTML, added: Date.now() },
              ]);
            }
          });
        });
      });

      bodyObserver.observe(nextElement, { childList: true });

      state.set("observers", {
        ...state.get("observers"),
        body: bodyObserver,
      });
    },

    stop: () => {
      const observers = state.get("observers");
      observers.modal?.disconnect();
    },
  },

  body: {
    start: () => {
      state.get("observers").body?.disconnect();

      const body = document.querySelector("body");

      const bodyObserver = new MutationObserver(async (mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type !== "childList" ||
            mutation.addedNodes.length === 0 ||
            !mutation.addedNodes[0].className
          ) {
            return;
          }

          if (mutation.addedNodes[0].className.includes("global-mission-modal_backdrop__oVezg")) {
            mutation.addedNodes[0].setAttribute(
              "style",
              "display: none !important"
            );
          }
        });
      });

      bodyObserver.observe(body, { childList: true });

      state.set("observers", {
        ...state.get("observers"),
        body: bodyObserver,
      });
    },

    stop: () => {
      const observers = state.get("observers");
      observers.body?.disconnect();
    },
  },

  toast: {
    start: () => {
      state.get("observers").toast?.disconnect();

      const nextElement = document.getElementById("__next");

      const toastObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type !== "childList" ||
            mutation.addedNodes.length === 0 ||
            !mutation.addedNodes[0].className ||
            !mutation.addedNodes[0].className.includes("toast")
          ) {
            return;
          }

          // mutation.addedNodes[0].setAttribute(
          //   "style",
          //   ""
          // );

          // <div class="toast_toast__zhSlo undefined toast_bottom__HBXFm" style="">
          //   <div class="toast_body__DVBLz">
          //     <img class="toast_side__n1FQp" src="https://cdn.fishtank.live/images/slices/toast-left.png" width="130" height="684" alt="">
          //       <div class="toast_message__l35K3 undefined">
          //         <img class="toast_top__mlvKy" src="https://cdn.fishtank.live/images/slices/toast-top.png" width="1562" height="69" alt="">
          //           <div class="toast_icon__kx0pj">
          //             <div class="icon_icon__bDzMA">
          //             </div>
          //           </div>
          //           <p>You spent ₣1</p>
          //           <img class="toast_bottom__HBXFm" src="https://cdn.fishtank.live/images/slices/toast-bottom.png" width="1562" height="69" alt="">
          //         </div>
          //         <div class="toast_close__iwAGl"><button class="close-button_close-button__BKUKA close-button_sm__n0dZT " type="button"><img src="https://cdn.fishtank.live/images/slices/close.png" alt="Close" width="32" height="32"></button></div><img class="toast_side__n1FQp" src="https://cdn.fishtank.live/images/slices/toast-right.png" width="130" height="684" alt=""></div></div>
          const toast = mutation.addedNodes[0].querySelector(".toast_message__l35K3");

          console.log(toast.textContent);
          console.log(toast.innerText);
          console.log(getElementText(toast));
          const toastText = getElementText(toast);
          const toastTextDowncase = toastText.toLowerCase();
          if (toastTextDowncase.includes("level") || toastTextDowncase.includes("item")) {
            return;
          }
          const wrapper = document.createElement("div");
          wrapper.innerText = toastText;
          wrapper.style.color = "white";
          wrapper.style.marginTop = "10px";
          wrapper.style.marginBottom = "10px";
          console.log(wrapper.innerHTML);
          console.log(wrapper.outerHTML);


          state.set("events", [
            ...state.get("events"),
            { html: wrapper.outerHTML, added: Date.now() },
          ]);
        });
      });

      toastObserver.observe(nextElement, { childList: true });

      state.set("observers", { ...state.get("observers"), toast: toastObserver });
    },

    stop: () => {
      const observers = state.get("observers");
      observers.toast?.disconnect();
    },
  },
};

export default observers;
