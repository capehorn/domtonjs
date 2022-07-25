// const TAGS = new Set ([ "a", "button", "div", "footer", "h1", "header", "input", "label", "li", "p", "section", "span", "strong", "ul" ]);
// const EVENTS = new Set ([ "blur", "change", "click", "contextmenu", "dblclick", "focus", 
//     "keydown", "keyup", "keypress", "load", "mousedown", "mouseover", "mouseout", "mouseup", "mousewheel", "resize",
//     "scroll", "submit", "unload", "touchstart", "touchend", "touchmove", "touchcancel" ]);

const HTML_ATTRS = new Map();
function addHtmlAttr ( name, length ) {
    if ( length === 1 || length === 2 ) {
        HTML_ATTRS.set( name, ({ name, length, setAttr: length === 1 ? ( elem, value ) => elem[name] = true : ( elem, value ) => elem.setAttribute( name, value.toString().trim()) }) );
        return;
    }
    console.log( "Unsupported attribute ('" + name + "') length: " + length + " \nOnly length 1 or 2 are supported.");
}

[ "autofocus", "checked" ].forEach( name => addHtmlAttr( name, 1 ) );
[ "class", "for", "height", "href", "id", "placeholder", "style", "type", "value", "width" ].forEach( name => addHtmlAttr( name, 2 ) );

const X_ATTRS = [
        {
            name: ".class",
            length: 1,   
            matcher: v => v.trim().startsWith( "." ), 
            setAttr: ( elem, value ) => elem.classList.add( value.trim().replace(/\./g, ' ').replace(/\s\s+/g, ' ').trim().split(" ") ) 
        },  
        {   
            name: "#id",
            length: 1,
            matcher: v => v.trim().startsWith( "#" ), 
            setAttr: ( elem, value ) => elem.setAttribute( "id", value.trim().substring( 1 ) ) 
        },
        (() => ({
            name: "-",
            length: 2,
            matchingValue: null,
            matcher(v) {
                const result = v.trim().startsWith( "-" );
                if ( result ) this.matchingValue = v.trim();
                return result;
            },
            setAttr( elem, value ) { 
                elem.setAttribute( `data${this.matchingValue}`, value.toString().trim() ); 
            }
        }))(),
];

export function dom ( UI, emitter ) {
    if ( Array.isArray( UI ) ) {
        const fragment = new DocumentFragment();
        processDomLiteral( fragment, UI, emitter );
        return fragment;
    }
    console.log( "Invalid dom" );
}

export function T ( strings ) {
    return document.createElement( strings[0] );
}

export function on ( eventName, fn, payload ) {
    if ( fn == undefined) {
        console.log( `Event handler function is missing for ${ eventName } ` );
    }
    return ( { regType: "eventHandler", eventName, fn, payload } );
}

const isString = value => ( typeof value === 'string' || value instanceof String );

const isRegType = value => value && value.regType;

function isFunction( value ) {
    return typeof value === "function";
}

function processDomLiteral ( parent, literal, emitter ) {
    if ( literal.length === 0 ) return;

    let currentElem = null;
    let attrProc = undefined;
    let pos = 1;

    literal.forEach( value  => {
        if ( value instanceof Element ) {
            currentElem = value;
            parent.appendChild( currentElem );
        } else if ( Array.isArray( value ) ) {
            if ( value.length === 0 ) {
                console.log( "Skip empty array" );
                return;
            } else {
                if ( value[0] instanceof Element ) {// check if child elements
                    processDomLiteral( currentElem, value, emitter );
                } else if ( value.length === 1 ) {// treat as text element
                    const v = value[ 0 ];
                    if ( isString( v )) {// text with fix value
                        currentElem.textContent = v;
                    } else if ( isFunction( v ) ) {
                        currentElem.textContent = v();
                        const domElem = currentElem;
                        if ( emitter == undefined ) {
                            console.log( `Emitter is undefined but dynamic text update function ${ v.name } requires one` );
                            return;
                        }
                        emitter.on( v, () => {
                            domElem.textContent = v();
                        });
                    } else {
                        currentElem.textContent = "" + v;
                        console.log( "Value were converted to string: " + value );
                    }
                } else {
                    console.log( "Invalid value: " + value );
                }
                return;
            }
        } else {
            if ( isRegType( value ) ) {
                if ( value.regType === "eventHandler" ) {
                    const { eventName, fn, payload } = value;
                    currentElem.addEventListener( eventName, e => fn( e, payload ) )
                    return;
                } else {
                    console.log( "Unknown reg type for value : " + JSON.stringify( value ) );
                    return;
                }
            }

            if ( isFunction( value ) ) {
                currentElem[ value.name ] = value;
                value( currentElem );
                currentElem.setAttribute( `data-fn`, value.name );
                return;
            }

            if ( attrProc == undefined ) {
                attrProc = findAttrProc( value );
                if ( attrProc == undefined ) {
                    console.log( "Can't find any matching attribute processor for value: " + value );
                    return;
                }
            } 
            
            if ( attrProc != undefined ) {
                if ( attrProc.length === 1 ) {
                    attrProc.setAttr( currentElem, value );
                    attrProc = undefined;
                    pos = 1;
                    return;
                } 
                if ( attrProc.length === 2 && pos === 2 ) {
                    attrProc.setAttr( currentElem, value );
                    attrProc = undefined;
                    pos = 1;
                    return;
                }
                pos += 1;
            }
        }
    });
}

function findAttrProc ( value ) {
    const trimmed = value.trim();
    let attrProc = HTML_ATTRS.get( trimmed );
    if ( attrProc == undefined ) {
        attrProc = X_ATTRS.find( v => v.matcher( value ) );
    }
    return attrProc;
}

// https://github.com/ai/nanoevents/blob/main/index.js
export let createNanoEvents = () => ({
    events: {},
    emit(event, ...args) {
        let callbacks = this.events[event] || [];
        for (let i = 0, length = callbacks.length; i < length; i++) {
            callbacks[i](...args);
        }
    },
    on(event, cb) {
        this.events[event]?.push(cb) || (this.events[event] = [cb]);
        return () => {
            this.events[event] = this.events[event]?.filter(i => cb !== i)
        }
    },
});