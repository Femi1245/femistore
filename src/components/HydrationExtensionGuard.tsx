import Script from "next/script";

/** Strip attrs injected by browser extensions (e.g. Bitdefender bis_skin_checked) before React hydrates. */
const STRIP_EXTENSION_ATTRS = `(function(){try{var keys=["bis_skin_checked","bis_register","cz-shortcut-listen","data-new-gr-c-s-check-loaded","data-gr-ext-installed"];function strip(el){if(!el||el.nodeType!==1)return;for(var i=0;i<keys.length;i++)el.removeAttribute(keys[i]);for(var c=el.firstChild;c;c=c.nextSibling)strip(c)}function clean(){strip(document.documentElement)}clean();if(typeof MutationObserver!=="undefined"){var obs=new MutationObserver(function(mutations){for(var j=0;j<mutations.length;j++){var m=mutations[j];if(m.type==="attributes"&&m.attributeName&&keys.indexOf(m.attributeName)>=0&&m.target.removeAttribute)m.target.removeAttribute(m.attributeName);if(m.addedNodes)for(var k=0;k<m.addedNodes.length;k++)strip(m.addedNodes[k])}});obs.observe(document.documentElement,{attributes:true,subtree:true,childList:true,attributeFilter:keys});window.addEventListener("load",function(){setTimeout(function(){obs.disconnect()},8000)},{once:true})}}catch(e){}})();`;

export function HydrationExtensionGuard() {
  return (
    <Script
      id="strip-browser-extension-attrs"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS }}
    />
  );
}
