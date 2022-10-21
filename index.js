// https://github.com/ai/nanoid
let nanoid = (t=21) => crypto.getRandomValues(new Uint8Array(t)).reduce(((t,e)=>t+=(e&=63)<36?e.toString(36):e<62?(e-26).toString(36).toUpperCase():e>62?"-":"_"),"");

const DOM_EVENTS = [
    "abort",
    "afterprint",
    "animationend",
    "animationiteration",
    "animationstart",
    "beforeprint",
    "beforeunload",
    "blur",
    "canplay",
    "canplaythrough",
    "change",
    "click",
    "contextmenu",
    "copy",
    "cut",
    "dblclick",
    "drag",
    "dragend",
    "dragenter",
    "dragleave",
    "dragover",
    "dragstart",
    "drop",
    "durationchange",
    "ended",
    "error",
    "focus",
    "focusin",
    "focusout",
    "fullscreenchange",
    "fullscreenerror",
    "hashchange",
    "input",
    "invalid",
    "keydown",
    "keypress",
    "keyup",
    "load",
    "loadeddata",
    "loadedmetadata",
    "loadstart",
    "message",
    "mousedown",
    "mouseenter",
    "mouseleave",
    "mousemove",
    "mouseover",
    "mouseout",
    "mouseup",
    "mousewheel",
    "offline",
    "online",
    "open",
    "pagehide",
    "pageshow",
    "paste",
    "pause",
    "play",
    "playing",
    "popstate",
    "progress",
    "ratechange",
    "resize",
    "reset",
    "scroll",
    "search",
    "seeked",
    "seeking",
    "select",
    "show",
    "stalled",
    "storage",
    "submit",
    "suspend",
    "timeupdate",
    "toggle",
    "touchcancel",
    "touchend",
    "touchmove",
    "touchstart",
    "transitionend",
    "unload",
    "volumechange",
    "waiting",
    "wheel"]

export function dom(strings, ...exprs) {
    const Handlers = new Map();

    const processExpr = (exp) => {
        if (Array.isArray(exp)) {
            const id = nanoid(12);
            Handlers.set(id, { fn: exp[0], prop: exp[1] } );
            return id;
        } else {
            return exp;
        }
    };

    const retVal = strings.map((s, i) => {
        const val = s + ( exprs[i] == undefined ? "" : processExpr(exprs[i]) );
        return val;
    }).join("");

    const df = document.createRange().createContextualFragment(retVal);
    const selQuery = DOM_EVENTS.map(name => `[\\(${name}\\)]`).join(" , ");
    [...df.querySelectorAll(selQuery)].forEach(elem => {
        [...elem.getAttributeNames()].forEach(attrName => {
            if (attrName.substring(0, 1) === "(" &&  attrName.substring(attrName.length-1) === ")") {
                const eventType = attrName.substring(1, attrName.length-1);
                const id = elem.getAttribute(attrName);
                const {fn, prop} = Handlers.get(id);
                elem.addEventListener(eventType, e => fn(e, prop));
                Handlers.delete(id);
            }
        })
    });
    if (Handlers.size !== 0) {
        console.error("Some handlers were not resolved");
    }
    return df;
}

export function comp(hostNode, pos, action = {}, update = {}) {
    return (df, publicMethods = {}) => {
        hostNode.insertAdjacentElement(pos, df.firstElementChild);
        const domNode = hostNode.lastElementChild;

        Object.entries(action).forEach(([k, v]) => action[k] = (...param) => { 
            v(...param); 
            if (update[k] != undefined) {
                update[k](domNode);
            }
        });
        Object.entries(publicMethods).forEach(([k, v]) => publicMethods[k] = (...param) => { 
            v(...param);
            if (update[k] != undefined) {
                update[k](domNode);
            }
        });
        return publicMethods;
    }
}