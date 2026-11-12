// Textos e estilo do portal de configuração (WiFiManager) em pt-BR, com o tema do app.
// Gerado a partir do wm_strings_en.h do WiFiManager 2.0.17 (MIT, tzapu/tablatronix); usado pelo
// build flag WM_STRINGS_FILE em platformio.ini. Cores iguais a app/src/theme.css.

// Cabeçalho mostrado em todas as páginas do portal (logo do app).
#ifndef PF_PORTAL_HEADER_DEFINED
#define PF_PORTAL_HEADER_DEFINED
const char PF_PORTAL_HEADER[] PROGMEM = "<header class='top'><svg viewBox='0 0 512 512' aria-hidden='true'><rect width='512' height='512' rx='112' fill"
"='#0d6b5f'/><g fill='#f6f3ee'><ellipse cx='190' cy='168' rx='38' ry='48'/><ellipse cx='322' cy='168' rx='38' r"
"y='48'/><ellipse cx='118' cy='262' rx='34' ry='42'/><ellipse cx='394' cy='262' rx='34' ry='42'/><path d='M256 "
"236c-62 0-104 78-104 118 0 38 40 50 104 50s104-12 104-50c0-40-42-118-104-118z'/></g></svg><div><b>Alimentador "
"de Pet</b><span>Configuração do Wi-Fi</span></div></header>";
#endif

/**
 * wm_strings_en.h
 * engligh strings for
 * WiFiManager, a library for the ESP8266/Arduino platform
 * for configuration of WiFi credentials using a Captive Portal
 *
 * @author Creator tzapu
 * @author tablatronix
 * @version 0.0.0
 * @license MIT
 */

#ifndef _WM_STRINGS_PT_H_
#define _WM_STRINGS_PT_H_


#ifndef WIFI_MANAGER_OVERRIDE_STRINGS
// !!! ABOVE WILL NOT WORK if you define in your sketch, must be build flag, if anyone one knows how to order includes to be able to do this it would be neat.. I have seen it done..

// strings files must include a consts file!
#include "wm_consts_en.h" // include constants, tokens, routes

const char WM_LANGUAGE[] PROGMEM = "pt-BR";

const char HTTP_HEAD_START[] PROGMEM = "<!DOCTYPE html><html lang='pt-BR'><head><meta name='format-detection' content='telephone=no'><meta charset='UT"
  "F-8'><meta name='viewport' content='width=device-width,initial-scale=1'><meta name='theme-color' content='#0d6"
  "b5f'><title>{v} · Alimentador</title>";

const char HTTP_SCRIPT[] PROGMEM = "<script>function c(l){document.getElementById('s').value=l.getAttribute('data-ssid')||l.innerText||l.textConte"
  "nt;p=l.nextElementSibling.classList.contains('l');document.getElementById('p').disabled=!p;if(p)document.getEl"
  "ementById('p').focus();}function f(){var x=document.getElementById('p');x.type==='password'?x.type='text':x.ty"
  "pe='password';}document.addEventListener('DOMContentLoaded',function(){var w=document.querySelector('.wrap');i"
  "f(w&&!document.querySelector('.big')){var h=document.createElement('h2');h.textContent=document.title.split(' "
  "· ')[0];w.insertBefore(h,w.firstChild);}});</script>";

const char HTTP_HEAD_END[] PROGMEM = "</head><body class='{c}'><div class='wrap'>";
// example of embedded logo, base64 encoded inline, No styling here
// const char HTTP_ROOT_MAIN[]        PROGMEM = "<img title=' alt=' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADQElEQVRoQ+2YjW0VQQyE7Q6gAkgFkAogFUAqgFQAVACpAKiAUAFQAaECQgWECggVGH1PPrRvn3dv9/YkFOksoUhhfzwz9ngvKrc89JbnLxuA/63gpsCmwCADWwkNEji8fVNgotDM7osI/x777x5l9F6JyB8R4eeVql4P0y8yNsjM7KGIPBORp558T04A+CwiH1UVUItiUQmZ2XMReSEiAFgjAPBeVS96D+sCYGaUx4cFbLfmhSpnqnrZuqEJgJnd8cQplVLciAgX//Cf0ToIeOB9wpmloLQAwpnVmAXgdf6pwjpJIz+XNoeZQQZlODV9vhc1Tuf6owrAk/8qIhFbJH7eI3eEzsvydQEICqBEkZwiALfF70HyHPpqScPV5HFjeFu476SkRA0AzOfy4hYwstj2ZkDgaphE7m6XqnoS7Q0BOPs/sw0kDROzjdXcCMFCNwzIy0EcRcOvBACfh4k0wgOmBX4xjfmk4DKTS31hgNWIKBCI8gdzogTgjYjQWFMw+o9LzJoZ63GUmjWm2wGDc7EvDDOj/1IVMIyD9SUAL0WEhpriRlXv5je5S+U1i2N88zdPuoVkeB+ls4SyxCoP3kVm9jsjpEsBLoOBNC5U9SwpGdakFkviuFP1keblATkTENTYcxkzgxTKOI3jyDxqLkQT87pMA++H3XvJBYtsNbBN6vuXq5S737WqHkW1VgMQNXJ0RshMqbbT33sJ5kpHWymzcJjNTeJIymJZtSQd9NHQHS1vodoFoTMkfbJzpRnLzB2vi6BZAJxWaCr+62BC+jzAxVJb3dmmiLzLwZhZNPE5e880Suo2AZgB8e8idxherqUPnT3brBDTlPxO3Z66rVwIwySXugdNd+5ejhqp/+NmgIwGX3Py3QBmlEi54KlwmjkOytQ+iJrLJj23S4GkOeecg8G091no737qvRRdzE+HLALQoMTBbJgBsCj5RSWUlUVJiZ4SOljb05eLFWgoJ5oY6yTyJp62D39jDANoKKcSocPJD5dQYzlFAFZJflUArgTPZKZwLXAnHmerfJquUkKZEgyzqOb5TuDt1P3nwxobqwPocZA11m4A1mBx5IxNgRH21ti7KbAGiyNn3HoF/gJ0w05A8xclpwAAAABJRU5ErkJggg==' /><h1>{v}</h1><h3>WiFiManager</h3>";
const char HTTP_ROOT_MAIN[] PROGMEM = "<div class='card'><span class='lbl'>Código do alimentador</span><b class='big'>{t}</b><p class='hint'>Digite e"
  "ste código no app para parear. Ele também é a chave de acesso: não divulgue.</p></div><p>Conecte o alimentador"
  " ao Wi-Fi da sua casa para usar o app de qualquer lugar.</p>";

const char * const HTTP_PORTAL_MENU[] PROGMEM = {
"<form action='/wifi' method='get'><button>Configurar Wi-Fi</button></form>\n",
"<form action='/0wifi' method='get'><button class='sec'>Configurar Wi-Fi (sem procurar)</button></form>\n",
"<form action='/info' method='get'><button class='sec'>Informações</button></form>\n",
"<form action='/param' method='get'><button class='sec'>Ajustes</button></form>\n",
"<form action='/close' method='get'><button class='sec'>Fechar</button></form>\n",
"<form action='/restart' method='get'><button class='sec'>Reiniciar</button></form>\n",
"<form action='/exit' method='get'><button class='sec'>Sair</button></form>\n",
"<form action='/erase' method='get'><button class='D'>Apagar Wi-Fi</button></form>\n",
"<form action='/update' method='get'><button class='sec'>Atualizar firmware</button></form>\n",
"<hr>"
};

// const char HTTP_PORTAL_OPTIONS[]   PROGMEM = strcat(HTTP_PORTAL_MENU[0] , HTTP_PORTAL_MENU[3] , HTTP_PORTAL_MENU[7]);
const char HTTP_PORTAL_OPTIONS[]   PROGMEM = "";
const char HTTP_ITEM_QI[]          PROGMEM = "<div role='img' aria-label='{r}%' title='{r}%' class='q q-{q} {i} {h}'></div>"; // rssi icons
const char HTTP_ITEM_QP[]          PROGMEM = "<div class='q {h}'>{r}%</div>"; // rssi percentage {h} = hidden showperc pref
const char HTTP_ITEM[] PROGMEM = "<div class='net'><a href='#p' onclick='c(this)' data-ssid='{V}'>{v}</a>{qi}{qp}</div>";
// const char HTTP_ITEM[]            PROGMEM = "<div><a href='#p' onclick='c(this)'>{v}</a> {R} {r}% {q} {e}</div>"; // test all tokens

const char HTTP_FORM_START[] PROGMEM = "<form method='POST' action='{v}' class='card'>";
const char HTTP_FORM_WIFI[] PROGMEM = "<label class='field'><span>Rede Wi-Fi</span><input id='s' name='s' maxlength='32' autocorrect='off' autocapita"
  "lize='none' spellcheck='false' placeholder='{v}'></label><label class='field'><span>Senha da rede</span><input"
  " id='p' name='p' maxlength='64' type='password' placeholder='{p}'></label><label class='check'><input type='ch"
  "eckbox' id='showpass' onclick='f()'>Mostrar senha</label><p class='hint'>Toque numa rede acima ou digite o nom"
  "e. Use a rede de 2,4 GHz: o alimentador não enxerga a de 5 GHz.</p>";
const char HTTP_FORM_WIFI_END[]    PROGMEM = "";
const char HTTP_FORM_STATIC_HEAD[] PROGMEM = "<hr>";
const char HTTP_FORM_END[] PROGMEM = "<button type='submit'>Salvar e conectar</button></form>";
const char HTTP_FORM_LABEL[] PROGMEM = "<label for='{i}'>{t}</label>";
const char HTTP_FORM_PARAM_HEAD[] PROGMEM = "<hr>";
const char HTTP_FORM_PARAM[]       PROGMEM = "<br/><input id='{i}' name='{n}' maxlength='{l}' value='{v}' {c}>\n"; // do not remove newline!

const char HTTP_SCAN_LINK[] PROGMEM = "<form action='/wifi?refresh=1' method='POST'><button name='refresh' value='1' class='sec'>Procurar redes de no"
  "vo</button></form>";
const char HTTP_SAVED[] PROGMEM = "<div class='msg S'><strong>Pronto! Conectando ao Wi-Fi…</strong><p>O alimentador vai sair desta rede e entrar "
  "no Wi-Fi da sua casa. Volte o celular para o seu Wi-Fi e abra o app.</p><p class='hint'>Se a rede do alimentad"
  "or aparecer de novo daqui a 1 minuto, a senha estava errada: conecte nela e tente outra vez.</p></div>";
const char HTTP_PARAMSAVED[] PROGMEM = "<div class='msg S'>Salvo</div>";
const char HTTP_END[]              PROGMEM = "</div></body></html>";
const char HTTP_ERASEBTN[] PROGMEM = "<form action='/erase' method='get'><button class='D'>Apagar Wi-Fi salvo</button></form>";
const char HTTP_UPDATEBTN[] PROGMEM = "<form action='/update' method='get'><button class='sec'>Atualizar firmware</button></form>";
const char HTTP_BACKBTN[] PROGMEM = "<form action='/' method='get'><button class='ghost'>Voltar</button></form>";

const char HTTP_STATUS_ON[] PROGMEM = "<div class='msg S'><strong>Conectado</strong> a {v}<br><small>IP {i}</small></div>";
const char HTTP_STATUS_OFF[] PROGMEM = "<div class='msg {c}'><strong>Não conectou</strong> a {v}{r}</div>";
const char HTTP_STATUS_OFFPW[] PROGMEM = "<br>Senha errada";
const char HTTP_STATUS_OFFNOAP[] PROGMEM = "<br>Rede não encontrada (é de 2,4 GHz?)";
const char HTTP_STATUS_OFFFAIL[] PROGMEM = "<br>Não foi possível conectar";
const char HTTP_STATUS_NONE[] PROGMEM = "<div class='msg'>Nenhum Wi-Fi configurado ainda.</div>";
const char HTTP_BR[] PROGMEM = "<br>";

const char HTTP_STYLE[] PROGMEM = "<style>:root{--bg:#f6f3ee;--surface:#fff;--surface-2:#f0ece4;--line:#e2dccf;--text:#1f2421;--text-2:#5b625d;--"
  "primary:#0d6b5f;--primary-ink:#fff;--primary-soft:#dcefeb;--ok:#166534;--ok-soft:#dcf2e1;--bad:#b91c1c;--bad-s"
  "oft:#fbe2e0;--shadow:0 1px 2px rgb(31 36 33/6%),0 4px 16px rgb(31 36 33/6%);color-scheme:light}@media(prefers-"
  "color-scheme:dark){:root{--bg:#121514;--surface:#1b201e;--surface-2:#232927;--line:#2f3633;--text:#eef1ef;--te"
  "xt-2:#a7b0ab;--primary:#4fc2b0;--primary-ink:#082621;--primary-soft:#183a35;--ok:#6fd28d;--ok-soft:#173322;--b"
  "ad:#f28b82;--bad-soft:#3d1d1b;--shadow:0 1px 2px rgb(0 0 0/40%);color-scheme:dark}.q{filter:invert(1)}}*{box-s"
  "izing:border-box}body{margin:0;padding:16px;background:var(--bg);color:var(--text);font:16px/1.45 system-ui,-a"
  "pple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transp"
  "arent;overflow-wrap:break-word}.top,.wrap{max-width:480px;margin:0 auto}.top{display:flex;align-items:center;g"
  "ap:12px;margin-bottom:20px}.top svg{width:44px;height:44px;flex:none}.top b{display:block;font-size:20px;font-"
  "weight:700;line-height:1.2}.top span{font-size:14px;color:var(--text-2)}.wrap{display:flex;flex-direction:colu"
  "mn;gap:12px}h1,h2,h3,p{margin:0}h2{font-size:22px;font-weight:700;letter-spacing:-.01em}h3{font-size:15px;font"
  "-weight:600;color:var(--text-2);margin-top:8px}.card{background:var(--surface);border-radius:18px;box-shadow:v"
  "ar(--shadow);padding:16px;display:flex;flex-direction:column;gap:8px}.lbl{font-size:14px;font-weight:600;color"
  ":var(--text-2)}.big{font-size:24px;font-weight:700;letter-spacing:.02em;color:var(--primary);line-height:1.2;o"
  "verflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.hint{font-size:13px;color:var(-"
  "-text-2)}form{display:flex;flex-direction:column;gap:12px;margin:0}button{min-height:48px;width:100%;padding:0"
  " 18px;border-radius:14px;border:0;cursor:pointer;font:inherit;font-weight:650;background:var(--primary);color:"
  "var(--primary-ink)}button.sec{background:var(--surface-2);color:var(--text)}button.ghost{background:transparen"
  "t;color:var(--primary)}button.D{background:var(--bad-soft);color:var(--bad)}button:active{transform:scale(.98)"
  "}.field{display:flex;flex-direction:column;gap:6px}.field>span{font-size:14px;font-weight:600;color:var(--text"
  "-2)}input{font:inherit;color:inherit}input:not([type=checkbox]):not([type=file]){display:block;width:100%;heig"
  "ht:48px;padding:0 14px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);-webkit-app"
  "earance:none;appearance:none}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid color-"
  "mix(in srgb,var(--primary) 55%,transparent);outline-offset:2px}.check{display:flex;align-items:center;gap:8px;"
  "font-size:15px;color:var(--text-2)}.check input{width:20px;height:20px;margin:0;accent-color:var(--primary)}.n"
  "et{display:flex;align-items:center;gap:4px;min-height:52px;padding-right:12px;background:var(--surface);border"
  "-radius:14px;box-shadow:var(--shadow)}.net a{flex:1;min-width:0;align-self:stretch;display:flex;align-items:ce"
  "nter;padding:0 16px;color:var(--text);font-weight:600;text-decoration:none;overflow-wrap:anywhere}.msg{padding"
  ":14px 16px;border-radius:14px;background:var(--surface-2);font-size:15px}.msg.S{background:var(--ok-soft);colo"
  "r:var(--ok)}.msg.D{background:var(--bad-soft);color:var(--bad)}.msg.P{background:var(--primary-soft);color:var"
  "(--primary)}.msg p{margin-top:6px;color:var(--text)}hr{border:0;border-top:1px solid var(--line);margin:4px 0;"
  "width:100%}dl{margin:0}dt{font-size:14px;font-weight:600;color:var(--text-2)}dd{margin:0 0 10px}.h{display:non"
  "e}:disabled{opacity:.5}.q{height:16px;margin:0;padding:0 5px;text-align:right;min-width:38px;float:right}.q.q-"
  "0:after{background-position-x:0}.q.q-1:after{background-position-x:-16px}.q.q-2:after{background-position-x:-3"
  "2px}.q.q-3:after{background-position-x:-48px}.q.q-4:after{background-position-x:-64px}.q.l:before{background-p"
  "osition-x:-80px;padding-right:5px}.ql .q{float:left}.q:after,.q:before{content:'';width:16px;height:16px;displ"
  "ay:inline-block;background-repeat:no-repeat;background-position: 16px 0;background-image:url('data:image/png;b"
  "ase64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAAQCAMAAADeZIrLAAAAJFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADH"
  "Jj5lAAAAC3RSTlMAIjN3iJmqu8zd7vF8pzcAAABsSURBVHja7Y1BCsAwCASNSVo3/v+/BUEiXnIoXkoX5jAQMxTHzK9cVSnvDxwD8bFx8PhZ9q"
  "8FmghXBhqA1faxk92PsxvRc2CCCFdhQCbRkLoAQ3q/wWUBqG35ZxtVzW4Ed6LngPyBU2CobdIDQ5oPWI5nCUwAAAAASUVORK5CYII=');}@med"
  "ia (-webkit-min-device-pixel-ratio: 2),(min-resolution: 192dpi){.q:before,.q:after {background-image:url('data"
  ":image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALwAAAAgCAMAAACfM+KhAAAALVBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  "AAAAAAAAAAAAAAAAAAAAAADAOrOgAAAADnRSTlMAESIzRGZ3iJmqu8zd7gKjCLQAAACmSURBVHgB7dDBCoMwEEXRmKlVY3L//3NLhyzqIqSUgg"
  "y8uxnhCR5Mo8xLt+14aZ7wwgsvvPA/ofv9+44334UXXngvb6XsFhO/VoC2RsSv9J7x8BnYLW+AjT56ud/uePMdb7IP8Bsc/e7h8Cfk912ghsNX"
  "WPpDC4hvN+D1560A1QPORyh84VKLjjdvfPFm++i9EWq0348XXnjhhT+4dIbCW+WjZim9AKk4UZMnnCEuAAAAAElFTkSuQmCC');background-"
  "size: 95px 16px;}}</style>";

#ifndef WM_NOHELP
const char HTTP_HELP[]             PROGMEM =
 "<br/><h3>Available pages</h3><hr>"
 "<table class='table'>"
 "<thead><tr><th>Page</th><th>Function</th></tr></thead><tbody>"
 "<tr><td><a href='/'>/</a></td>"
 "<td>Menu page.</td></tr>"
 "<tr><td><a href='/wifi'>/wifi</a></td>"
 "<td>Show WiFi scan results and enter WiFi configuration.(/0wifi noscan)</td></tr>"
 "<tr><td><a href='/wifisave'>/wifisave</a></td>"
 "<td>Save WiFi configuration information and configure device. Needs variables supplied.</td></tr>"
 "<tr><td><a href='/param'>/param</a></td>"
 "<td>Parameter page</td></tr>"
 "<tr><td><a href='/info'>/info</a></td>"
 "<td>Information page</td></tr>"
 "<tr><td><a href='/u'>/u</a></td>"
 "<td>OTA Update</td></tr>"
 "<tr><td><a href='/close'>/close</a></td>"
 "<td>Close the captiveportal popup, config portal will remain active</td></tr>"
 "<tr><td>/exit</td>"
 "<td>Exit Config portal, config portal will close</td></tr>"
 "<tr><td>/restart</td>"
 "<td>Reboot the device</td></tr>"
 "<tr><td>/erase</td>"
 "<td>Erase WiFi configuration and reboot device. Device will not reconnect to a network until new WiFi configuration data is entered.</td></tr>"
 "</table>"
 "<p/>Github <a href='https://github.com/tzapu/WiFiManager'>https://github.com/tzapu/WiFiManager</a>.";
#else
const char HTTP_HELP[]             PROGMEM = "";
#endif

const char HTTP_UPDATE[] PROGMEM = "Upload new firmware<br/><form method='POST' action='u' enctype='multipart/form-data' onchange=\"(function(el){document.getElementById('uploadbin').style.display = el.value=='' ? 'none' : 'initial';})(this)\"><input type='file' name='update' accept='.bin,application/octet-stream'><button id='uploadbin' type='submit' class='h D'>Update</button></form><small><a href='http://192.168.4.1/update' target='_blank'>* May not function inside captive portal, open in browser http://192.168.4.1</a><small>";
const char HTTP_UPDATE_FAIL[] PROGMEM = "<div class='msg D'><strong>A atualização falhou.</strong><br>Reinicie o alimentador e tente de novo.</div>";
const char HTTP_UPDATE_SUCCESS[] PROGMEM = "<div class='msg S'><strong>Atualizado.</strong><br>O alimentador está reiniciando…</div>";

#ifdef WM_JSTEST
const char HTTP_JS[] PROGMEM =
"<script>function postAjax(url, data, success) {"
"    var params = typeof data == 'string' ? data : Object.keys(data).map("
"            function(k){ return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]) }"
"        ).join('&');"
"    var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject(\"Microsoft.XMLHTTP\");"
"    xhr.open('POST', url);"
"    xhr.onreadystatechange = function() {"
"        if (xhr.readyState>3 && xhr.status==200) { success(xhr.responseText); }"
"    };"
"    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');"
"    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');"
"    xhr.send(params);"
"    return xhr;}"
"postAjax('/status', 'p1=1&p2=Hello+World', function(data){ console.log(data); });"
"postAjax('/status', { p1: 1, p2: 'Hello World' }, function(data){ console.log(data); });"
"</script>";
#endif

// Info html
// @todo remove html elements from progmem, repetetive strings
#ifdef ESP32
	const char HTTP_INFO_esphead[]    PROGMEM = "<h3>esp32</h3><hr><dl>";
	const char HTTP_INFO_chiprev[]    PROGMEM = "<dt>Chip rev</dt><dd>{1}</dd>";
  	const char HTTP_INFO_lastreset[]  PROGMEM = "<dt>Last reset reason</dt><dd>CPU0: {1}<br/>CPU1: {2}</dd>";
  	const char HTTP_INFO_aphost[]     PROGMEM = "<dt>Access point hostname</dt><dd>{1}</dd>";
    const char HTTP_INFO_psrsize[]    PROGMEM = "<dt>PSRAM Size</dt><dd>{1} bytes</dd>";
	const char HTTP_INFO_temp[]       PROGMEM = "<dt>Temperature</dt><dd>{1} C&deg; / {2} F&deg;</dd>";
    const char HTTP_INFO_hall[]       PROGMEM = "<dt>Hall</dt><dd>{1}</dd>";
#else
	const char HTTP_INFO_esphead[]    PROGMEM = "<h3>esp8266</h3><hr><dl>";
	const char HTTP_INFO_fchipid[]    PROGMEM = "<dt>Flash chip ID</dt><dd>{1}</dd>";
	const char HTTP_INFO_corever[]    PROGMEM = "<dt>Core version</dt><dd>{1}</dd>";
	const char HTTP_INFO_bootver[]    PROGMEM = "<dt>Boot version</dt><dd>{1}</dd>";
	const char HTTP_INFO_lastreset[]  PROGMEM = "<dt>Last reset reason</dt><dd>{1}</dd>";
	const char HTTP_INFO_flashsize[]  PROGMEM = "<dt>Real flash size</dt><dd>{1} bytes</dd>";
#endif

const char HTTP_INFO_memsmeter[]  PROGMEM = "<br/><progress value='{1}' max='{2}'></progress></dd>";
const char HTTP_INFO_memsketch[]  PROGMEM = "<dt>Memory - Sketch size</dt><dd>Used / Total bytes<br/>{1} / {2}";
const char HTTP_INFO_freeheap[]   PROGMEM = "<dt>Memory - Free heap</dt><dd>{1} bytes available</dd>";
const char HTTP_INFO_wifihead[]   PROGMEM = "<br/><h3>WiFi</h3><hr>";
const char HTTP_INFO_uptime[]     PROGMEM = "<dt>Uptime</dt><dd>{1} mins {2} secs</dd>";
const char HTTP_INFO_chipid[]     PROGMEM = "<dt>Chip ID</dt><dd>{1}</dd>";
const char HTTP_INFO_idesize[]    PROGMEM = "<dt>Flash size</dt><dd>{1} bytes</dd>";
const char HTTP_INFO_sdkver[]     PROGMEM = "<dt>SDK version</dt><dd>{1}</dd>";
const char HTTP_INFO_cpufreq[]    PROGMEM = "<dt>CPU frequency</dt><dd>{1}MHz</dd>";
const char HTTP_INFO_apip[]       PROGMEM = "<dt>Access point IP</dt><dd>{1}</dd>";
const char HTTP_INFO_apmac[]      PROGMEM = "<dt>Access point MAC</dt><dd>{1}</dd>";
const char HTTP_INFO_apssid[]     PROGMEM = "<dt>Access point SSID</dt><dd>{1}</dd>";
const char HTTP_INFO_apbssid[]    PROGMEM = "<dt>BSSID</dt><dd>{1}</dd>";
const char HTTP_INFO_stassid[]    PROGMEM = "<dt>Station SSID</dt><dd>{1}</dd>";
const char HTTP_INFO_staip[]      PROGMEM = "<dt>Station IP</dt><dd>{1}</dd>";
const char HTTP_INFO_stagw[]      PROGMEM = "<dt>Station gateway</dt><dd>{1}</dd>";
const char HTTP_INFO_stasub[]     PROGMEM = "<dt>Station subnet</dt><dd>{1}</dd>";
const char HTTP_INFO_dnss[]       PROGMEM = "<dt>DNS Server</dt><dd>{1}</dd>";
const char HTTP_INFO_host[]       PROGMEM = "<dt>Hostname</dt><dd>{1}</dd>";
const char HTTP_INFO_stamac[]     PROGMEM = "<dt>Station MAC</dt><dd>{1}</dd>";
const char HTTP_INFO_conx[]       PROGMEM = "<dt>Connected</dt><dd>{1}</dd>";
const char HTTP_INFO_autoconx[]   PROGMEM = "<dt>Autoconnect</dt><dd>{1}</dd>";

const char HTTP_INFO_aboutver[]     PROGMEM = "<dt>WiFiManager</dt><dd>{1}</dd>";
const char HTTP_INFO_aboutarduino[] PROGMEM = "<dt>Arduino</dt><dd>{1}</dd>";
const char HTTP_INFO_aboutsdk[]     PROGMEM = "<dt>ESP-SDK/IDF</dt><dd>{1}</dd>";
const char HTTP_INFO_aboutdate[]    PROGMEM = "<dt>Build date</dt><dd>{1}</dd>";

const char S_brand[]              PROGMEM = "WiFiManager";
const char S_debugPrefix[]        PROGMEM = "*wm:";
const char S_y[] PROGMEM = "Sim";
const char S_n[] PROGMEM = "Não";
const char S_enable[] PROGMEM = "Ligado";
const char S_disable[] PROGMEM = "Desligado";
const char S_GET[]                PROGMEM = "GET";
const char S_POST[]               PROGMEM = "POST";
const char S_NA[] PROGMEM = "Desconhecido";
const char S_passph[]             PROGMEM = "********";
const char S_titlewifisaved[] PROGMEM = "Wi-Fi salvo";
const char S_titlewifisettings[] PROGMEM = "Ajustes salvos";
const char S_titlewifi[] PROGMEM = "Escolha a rede da sua casa";
const char S_titleinfo[] PROGMEM = "Informações";
const char S_titleparam[] PROGMEM = "Ajustes";
const char S_titleparamsaved[] PROGMEM = "Ajustes salvos";
const char S_titleexit[] PROGMEM = "Sair";
const char S_titlereset[] PROGMEM = "Reiniciar";
const char S_titleerase[] PROGMEM = "Apagar";
const char S_titleclose[] PROGMEM = "Fechar";
const char S_options[]            PROGMEM = "options";
const char S_nonetworks[] PROGMEM = "<div class='msg'>Nenhuma rede encontrada. Toque em “Procurar redes de novo”.</div>";
const char S_staticip[] PROGMEM = "IP fixo";
const char S_staticgw[] PROGMEM = "Gateway fixo";
const char S_staticdns[] PROGMEM = "DNS fixo";
const char S_subnet[] PROGMEM = "Máscara";
const char S_exiting[] PROGMEM = "Saindo";
const char S_resetting[] PROGMEM = "O alimentador vai reiniciar em alguns segundos.";
const char S_closing[] PROGMEM = "Pode fechar a página; a rede de configuração continua ligada.";
const char S_error[] PROGMEM = "Ocorreu um erro";
const char S_notfound[] PROGMEM = "Página não encontrada\n\n";
const char S_uri[]                PROGMEM = "URI: ";
const char S_method[]             PROGMEM = "\nMethod: ";
const char S_args[]               PROGMEM = "\nArguments: ";
const char S_parampre[]           PROGMEM = "param_";

// debug strings
const char D_HR[]                 PROGMEM = "--------------------";


// softap ssid default prefix
#ifdef ESP8266
    const char S_ssidpre[]        PROGMEM = "ESP";
#elif defined(ESP32)
    const char S_ssidpre[]        PROGMEM = "ESP32";
#else
    const char S_ssidpre[]        PROGMEM = "WM";
#endif

// END WIFI_MANAGER_OVERRIDE_STRINGS
#endif

#endif
