// add delayed functionality here

/**
 * Loads the State Farm chat widget (sf-chat custom element) and mounts it.
 * Self-contained module with its own shadow-DOM styling — no extra CSS needed.
 */
function loadChat() {
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://chat.demngd01.c1.statefarm/sf-chat.js';
  document.head.append(script);

  const chat = document.createElement('sf-chat');
  chat.setAttribute('config-key', 'DigitalExperienceChatbot');
  chat.setAttribute('theme', 'traditional');
  chat.setAttribute('attributes', JSON.stringify({ experience: 'b2b' }));
  document.body.append(chat);
}

loadChat();
