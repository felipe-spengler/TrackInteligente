const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const searchInput = document.getElementById('search-ref');
  const searchBtn = document.getElementById('btn-search');
  const searchAlert = document.getElementById('search-alert');
  
  const infoEmpty = document.getElementById('lead-info-empty');
  const infoContent = document.getElementById('lead-info-content');
  const infoRef = document.getElementById('info-ref');
  const infoStatus = document.getElementById('info-status');
  const infoPhone = document.getElementById('info-phone');
  const infoFbclid = document.getElementById('info-fbclid');
  const infoSource = document.getElementById('info-source');
  const infoMedium = document.getElementById('info-medium');
  const infoCampaign = document.getElementById('info-campaign');

  const eventForm = document.getElementById('event-form');
  const eventRef = document.getElementById('event-ref');
  const eventPhone = document.getElementById('event-phone');
  const eventStatusSelection = document.getElementById('event-status');
  const groupValue = document.getElementById('group-value');
  const eventValue = document.getElementById('event-value');
  const submitBtn = document.getElementById('btn-submit');
  const actionAlert = document.getElementById('action-alert');

  let activeLead = null;

  // Show/hide value field depending on status type
  eventStatusSelection.addEventListener('change', (e) => {
    if (e.target.value === 'completed') {
      groupValue.style.display = 'block';
    } else {
      groupValue.style.display = 'none';
    }
  });

  // Search Lead Handler
  searchBtn.addEventListener('click', async () => {
    const code = searchInput.value.trim().toUpperCase();
    if (!code) {
      showMsg(searchAlert, 'Por favor, digite um código de referência.', 'danger');
      return;
    }

    searchAlert.style.display = 'none';
    try {
      const response = await fetch(`${API_BASE_URL}/api/leads/${code}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Código de referência não encontrado.');
        }
        throw new Error('Erro ao buscar lead no servidor.');
      }
      
      const lead = await response.json();
      activeLead = lead;
      populateLeadInfo(lead);
      showMsg(searchAlert, 'Lead encontrado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      resetLeadInfo();
      showMsg(searchAlert, error.message, 'danger');
    }
  });

  function populateLeadInfo(lead) {
    infoEmpty.style.display = 'none';
    infoContent.style.display = 'block';

    infoRef.textContent = lead.ref_code;
    infoPhone.textContent = lead.phone_number || 'Não informado';
    
    // Status Badge classes
    infoStatus.className = `status-badge status-${lead.status}`;
    infoStatus.textContent = translateStatus(lead.status);
    
    infoFbclid.textContent = lead.fbclid || 'Nenhum';
    infoFbclid.title = lead.fbclid || '';
    infoSource.textContent = lead.utm_source || 'Orgânico';
    infoMedium.textContent = lead.utm_medium || 'Nenhum';
    infoCampaign.textContent = lead.utm_campaign || 'Nenhum';

    // Populate the Action Form
    eventRef.value = lead.ref_code;
    eventPhone.value = lead.phone_number || '';
    submitBtn.removeAttribute('disabled');
  }

  function resetLeadInfo() {
    activeLead = null;
    infoEmpty.style.display = 'block';
    infoContent.style.display = 'none';
    
    eventRef.value = '';
    eventPhone.value = '';
    submitBtn.setAttribute('disabled', 'true');
  }

  function translateStatus(status) {
    switch(status) {
      case 'initiated': return 'Iniciado (Contato)';
      case 'data_shared': return 'Dados Enviados';
      case 'completed': return 'Compra Concluída';
      default: return status;
    }
  }

  // Update Status Form Submit
  eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeLead) return;

    actionAlert.style.display = 'none';
    submitBtn.setAttribute('disabled', 'true');
    submitBtn.textContent = 'Enviando...';

    const payload = {
      refCode: activeLead.ref_code,
      phoneNumber: eventPhone.value.trim(),
      status: eventStatusSelection.value,
      value: eventStatusSelection.value === 'completed' ? parseFloat(eventValue.value) : undefined
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/leads/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar o lead.');
      }

      // Success
      showMsg(actionAlert, `Sucesso! Status atualizado para: ${translateStatus(payload.status)}. CAPI Meta: ${data.metaEventSent ? 'Disparado' : 'Não enviado (Verifique as chaves no backend)'}`, 'success');
      
      // Reload lead info
      populateLeadInfo(data.lead);
    } catch (error) {
      console.error(error);
      showMsg(actionAlert, error.message, 'danger');
    } finally {
      submitBtn.removeAttribute('disabled');
      submitBtn.textContent = 'Atualizar & Disparar Evento';
    }
  });

  // Helper function to display messages
  function showMsg(element, text, type) {
    element.textContent = text;
    element.style.display = 'block';
    element.className = `alert-box alert-${type}`;
  }
});
