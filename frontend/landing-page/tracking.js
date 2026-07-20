// Configuration - change this to your backend server URL in production
const API_BASE_URL = 'http://localhost:3000';

(function () {
  console.log('[Tracking Script] Initialized');

  // 1. Capture parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = urlParams.get('fbclid') || '';
  const utm_source = urlParams.get('utm_source') || '';
  const utm_medium = urlParams.get('utm_medium') || '';
  const utm_campaign = urlParams.get('utm_campaign') || '';

  // Helper to read browser cookies
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  }

  // 2. Capture Meta cookies
  const fbp = getCookie('_fbp') || '';
  const fbc = getCookie('_fbc') || '';

  // 3. Generate a random short reference code (e.g. REF-4821)
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  const refCode = `REF-${randomNumber}`;

  // Update UI to show the reference code to the user
  const refDisplay = document.getElementById('ref-code-display');
  if (refDisplay) {
    refDisplay.textContent = refCode;
  }

  // 4. Send the initial tracking data to the backend via POST
  const leadPayload = {
    refCode,
    fbclid,
    fbp,
    fbc,
    utm_source,
    utm_medium,
    utm_campaign
  };

  console.log('[Tracking Script] Sending tracking payload to backend:', leadPayload);

  fetch(`${API_BASE_URL}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(leadPayload)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('[Tracking Script] Lead saved successfully in backend:', data);
  })
  .catch(error => {
    console.error('[Tracking Script] Error saving lead to backend:', error);
  });

  // 5. Intercept and modify all WhatsApp links on the page
  document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
    try {
      const hrefAttr = link.getAttribute('href') || '';
      // Extract the phone/base number URL (e.g. https://wa.me/5511999999999)
      const baseHref = hrefAttr.split('?')[0];
      
      // Construct a personalized WhatsApp text message containing the refCode
      const textMessage = `Olá! Quero saber mais sobre o produto. [Não apague este código: ${refCode}]`;
      
      // Update link href to include the pre-filled text parameter
      link.setAttribute('href', `${baseHref}?text=${encodeURIComponent(textMessage)}`);
      console.log('[Tracking Script] Updated WhatsApp button link with reference:', refCode);
    } catch (e) {
      console.error('[Tracking Script] Failed to modify WhatsApp link:', e);
    }
  });

})();
