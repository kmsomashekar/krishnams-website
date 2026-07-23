import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const CHANNEL_LABELS = {
  LINKEDIN: 'LinkedIn',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  CALL: 'Call',
  OTHER: 'Other'
};

const DIRECTION_LABELS = {
  OUTBOUND: 'Outbound / Sent',
  INBOUND: 'Inbound / Received'
};

const INTERACTION_TYPE_LABELS = {
  INITIAL_OUTREACH: 'Initial Outreach',
  RECEIVED_REPLY: 'Received Reply',
  FOLLOW_UP: 'Follow-up',
  RESUME_SHARED: 'Resume Shared',
  CALL: 'Call',
  REFERRAL_OFFERED: 'Referral Offered',
  APPLIED_THROUGH_REFERRAL: 'Applied Through Referral',
  NOTE: 'Note',
  OTHER: 'Other'
};

const STATUS_CLASSES = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PLANNED: 'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200'
};

// API Client helpers for Contacts & Interactions
async function fetchContacts() {
  const res = await fetch('/api/v1/contacts');
  if (!res.ok) throw new Error('Failed to fetch contacts');
  const body = await res.json();
  if (!body.success) throw new Error(body.error?.message || 'Failed to load contacts');
  return body.data.contacts || [];
}

async function createContact(payload) {
  const res = await fetch('/api/v1/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to create contact');
  return body.data;
}

async function updateContact({ id, ...payload }) {
  const res = await fetch(`/api/v1/contacts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to update contact');
  return body.data;
}

async function deleteContact(id) {
  const res = await fetch(`/api/v1/contacts/${id}`, { method: 'DELETE' });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to delete contact');
  return body.data;
}

async function fetchInteractions(contactId) {
  if (!contactId) return [];
  const res = await fetch(`/api/v1/contacts/${contactId}/interactions`);
  if (!res.ok) throw new Error('Failed to fetch interactions');
  const body = await res.json();
  if (!body.success) throw new Error(body.error?.message || 'Failed to load interactions');
  return body.data.interactions || [];
}

async function createInteraction({ contactId, ...payload }) {
  const res = await fetch(`/api/v1/contacts/${contactId}/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to create interaction');
  return body.data;
}

async function updateInteraction({ id, ...payload }) {
  const res = await fetch(`/api/v1/interactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to update interaction');
  return body.data;
}

async function deleteInteraction(id) {
  const res = await fetch(`/api/v1/interactions/${id}`, { method: 'DELETE' });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to delete interaction');
  return body.data;
}

export default function Outreach() {
  const queryClient = useQueryClient();
  const [selectedContactId, setSelectedContactId] = useState(null);

  // Contact Modal States
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactError, setContactError] = useState('');
  const [contactForm, setContactForm] = useState({
    person_name: '',
    company: '',
    email: '',
    phone: '',
    linkedin_url: '',
    notes: ''
  });

  // Interaction Modal States
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [interactionError, setInteractionError] = useState('');
  const [interactionForm, setInteractionForm] = useState({
    interaction_date: new Date().toISOString().split('T')[0],
    channel: 'LINKEDIN',
    direction: 'OUTBOUND',
    interaction_type: 'INITIAL_OUTREACH',
    message_or_notes: '',
    follow_up_date: '',
    status: 'COMPLETED'
  });

  // Queries
  const { data: contacts = [], isLoading: isLoadingContacts, isError: isContactError, error: contactErrorObj } = useQuery({
    queryKey: ['contacts'],
    queryFn: fetchContacts
  });

  // Derive the active contact object from the fetched contacts list to guarantee absolute data freshness
  const selectedContact = contacts.find((c) => c.id === selectedContactId) || null;

  const {
    data: interactions = [],
    isLoading: isLoadingInteractions,
    isError: isInteractionsError,
    error: interactionsError
  } = useQuery({
    queryKey: ['contact-interactions', selectedContactId],
    queryFn: () => fetchInteractions(selectedContactId),
    enabled: Boolean(selectedContactId)
  });

  // Contact Mutations
  const createContactMutation = useMutation({
    mutationFn: createContact,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      closeContactModal();
    },
    onError: (err) => setContactError(err.message)
  });

  const updateContactMutation = useMutation({
    mutationFn: updateContact,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      closeContactModal();
    },
    onError: (err) => setContactError(err.message)
  });

  const deleteContactMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: async (_, deletedId) => {
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      if (selectedContactId === deletedId) {
        setSelectedContactId(null);
      }
    },
    onError: (err) => alert(err.message)
  });

  // Interaction Mutations
  const createInteractionMutation = useMutation({
    mutationFn: createInteraction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-interactions', selectedContactId] });
      closeInteractionModal();
    },
    onError: (err) => setInteractionError(err.message)
  });

  const updateInteractionMutation = useMutation({
    mutationFn: updateInteraction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-interactions', selectedContactId] });
      closeInteractionModal();
    },
    onError: (err) => setInteractionError(err.message)
  });

  const deleteInteractionMutation = useMutation({
    mutationFn: deleteInteraction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-interactions', selectedContactId] });
    },
    onError: (err) => alert(err.message)
  });

  // Handlers - Contact Modal
  const openAddContactModal = () => {
    setEditingContact(null);
    setContactForm({ person_name: '', company: '', email: '', phone: '', linkedin_url: '', notes: '' });
    setContactError('');
    setIsContactModalOpen(true);
  };

  const openEditContactModal = (contact, e) => {
    e?.stopPropagation();
    setEditingContact(contact);
    setContactForm({
      person_name: contact.person_name || '',
      company: contact.company || '',
      email: contact.email || '',
      phone: contact.phone || '',
      linkedin_url: contact.linkedin_url || '',
      notes: contact.notes || ''
    });
    setContactError('');
    setIsContactModalOpen(true);
  };

  const closeContactModal = () => {
    setIsContactModalOpen(false);
    setEditingContact(null);
    setContactError('');
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactError('');

    if (contactForm.email && contactForm.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactForm.email.trim())) {
        setContactError('Please enter a valid email address format.');
        return;
      }
    }

    const payload = {
      person_name: contactForm.person_name.trim(),
      company: contactForm.company ? contactForm.company.trim() : null,
      email: contactForm.email ? contactForm.email.trim() : null,
      phone: contactForm.phone ? contactForm.phone.trim() : null,
      linkedin_url: contactForm.linkedin_url ? contactForm.linkedin_url.trim() : null,
      notes: contactForm.notes ? contactForm.notes.trim() : null
    };

    if (editingContact) {
      updateContactMutation.mutate({ id: editingContact.id, ...payload });
    } else {
      createContactMutation.mutate(payload);
    }
  };

  // Handlers - Interaction Modal
  const openAddInteractionModal = () => {
    setEditingInteraction(null);
    setInteractionForm({
      interaction_date: new Date().toISOString().split('T')[0],
      channel: 'LINKEDIN',
      direction: 'OUTBOUND',
      interaction_type: 'INITIAL_OUTREACH',
      message_or_notes: '',
      follow_up_date: '',
      status: 'COMPLETED'
    });
    setInteractionError('');
    setIsInteractionModalOpen(true);
  };

  const openEditInteractionModal = (item) => {
    setEditingInteraction(item);
    setInteractionForm({
      interaction_date: item.interaction_date || '',
      channel: item.channel || 'LINKEDIN',
      direction: item.direction || 'OUTBOUND',
      interaction_type: item.interaction_type || 'INITIAL_OUTREACH',
      message_or_notes: item.message_or_notes || '',
      follow_up_date: item.follow_up_date || '',
      status: item.status || 'COMPLETED'
    });
    setInteractionError('');
    setIsInteractionModalOpen(true);
  };

  const closeInteractionModal = () => {
    setIsInteractionModalOpen(false);
    setEditingInteraction(null);
    setInteractionError('');
  };

  const handleInteractionSubmit = (e) => {
    e.preventDefault();
    setInteractionError('');

    const payload = {
      interaction_date: interactionForm.interaction_date,
      channel: interactionForm.channel,
      direction: interactionForm.direction,
      interaction_type: interactionForm.interaction_type,
      message_or_notes: interactionForm.message_or_notes ? interactionForm.message_or_notes.trim() : null,
      follow_up_date: interactionForm.follow_up_date ? interactionForm.follow_up_date : null,
      status: interactionForm.status
    };

    if (editingInteraction) {
      updateInteractionMutation.mutate({ id: editingInteraction.id, ...payload });
    } else {
      createInteractionMutation.mutate({ contactId: selectedContactId, ...payload });
    }
  };

  if (isLoadingContacts) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] space-y-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Loading professional contacts...</p>
      </div>
    );
  }

  if (isContactError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-base font-semibold mb-1">Unable to load contacts</h3>
        <p className="text-sm opacity-90">{contactErrorObj?.message || 'An error occurred.'}</p>
      </div>
    );
  }

  // If a contact is selected, show Contact Detail & Relationship Timeline view
  if (selectedContact) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb / Back button */}
        <div>
          <button
            onClick={() => setSelectedContactId(null)}
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            ← Back to Contacts List
          </button>
        </div>

        {/* Contact Header Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900">{selectedContact.person_name}</h1>
              {selectedContact.company && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                  {selectedContact.company}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 pt-1">
              {selectedContact.email && (
                <a href={`mailto:${selectedContact.email}`} className="text-indigo-600 hover:underline">
                  ✉️ {selectedContact.email}
                </a>
              )}
              {selectedContact.phone && (
                <span>📞 {selectedContact.phone}</span>
              )}
              {selectedContact.linkedin_url && (
                <a href={selectedContact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  🔗 LinkedIn Profile
                </a>
              )}
            </div>
            {selectedContact.notes && (
              <p className="text-sm text-slate-600 pt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-700">Notes:</span> {selectedContact.notes}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={(e) => openEditContactModal(selectedContact, e)}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Edit Contact
            </button>
            <button
              onClick={openAddInteractionModal}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
            >
              + Add Interaction
            </button>
          </div>
        </div>

        {/* Relationship Timeline Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Relationship Timeline</h2>
            {!isLoadingInteractions && !isInteractionsError && (
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {interactions.length} {interactions.length === 1 ? 'Interaction' : 'Interactions'}
              </span>
            )}
          </div>

          {isLoadingInteractions ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : isInteractionsError ? (
            <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-base font-semibold mb-1">Unable to load interactions</h3>
              <p className="text-sm opacity-90">{interactionsError?.message || 'An error occurred while fetching interactions.'}</p>
            </div>
          ) : interactions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
              <h3 className="text-base font-medium text-slate-900">No interactions recorded yet</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                Log outreach, replies, calls, or follow-ups to build this contact's relationship history.
              </p>
              <div className="mt-5">
                <button
                  onClick={openAddInteractionModal}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 shadow-sm transition-colors"
                >
                  Log First Interaction
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {interactions.map((item) => (
                <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:border-slate-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{item.interaction_date}</span>
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-indigo-50 text-indigo-700">
                        {CHANNEL_LABELS[item.channel] || item.channel}
                      </span>
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">
                        {DIRECTION_LABELS[item.direction] || item.direction}
                      </span>
                      <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-900 text-white">
                        {INTERACTION_TYPE_LABELS[item.interaction_type] || item.interaction_type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${STATUS_CLASSES[item.status] || 'bg-slate-100 text-slate-600'}`}>
                        {item.status}
                      </span>
                      <button
                        onClick={() => openEditInteractionModal(item)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this interaction?')) {
                            deleteInteractionMutation.mutate(item.id);
                          }
                        }}
                        className="text-xs font-semibold text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {item.message_or_notes && (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {item.message_or_notes}
                    </p>
                  )}

                  {(item.follow_up_date || item.template_used) && (
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3 pt-2 border-t border-slate-50">
                      {item.follow_up_date && (
                        <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          📅 Follow-up due: {item.follow_up_date}
                        </span>
                      )}
                      {item.template_used && (
                        <span className="text-slate-400">Template: {item.template_used}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interaction Modal */}
        {isInteractionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg w-full p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingInteraction ? 'Edit Interaction' : 'Add Interaction'}
                </h3>
                <button onClick={closeInteractionModal} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
              </div>

              {interactionError && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">{interactionError}</div>
              )}

              <form onSubmit={handleInteractionSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Interaction Date *</label>
                    <input
                      type="date"
                      required
                      value={interactionForm.interaction_date}
                      onChange={(e) => setInteractionForm({ ...interactionForm, interaction_date: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Status *</label>
                    <select
                      value={interactionForm.status}
                      onChange={(e) => setInteractionForm({ ...interactionForm, status: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
                    >
                      <option value="COMPLETED">Completed</option>
                      <option value="PLANNED">Planned</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Channel *</label>
                    <select
                      value={interactionForm.channel}
                      onChange={(e) => setInteractionForm({ ...interactionForm, channel: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
                    >
                      <option value="LINKEDIN">LinkedIn</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                      <option value="CALL">Call</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Direction *</label>
                    <select
                      value={interactionForm.direction}
                      onChange={(e) => setInteractionForm({ ...interactionForm, direction: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
                    >
                      <option value="OUTBOUND">Outbound</option>
                      <option value="INBOUND">Inbound</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Type *</label>
                    <select
                      value={interactionForm.interaction_type}
                      onChange={(e) => setInteractionForm({ ...interactionForm, interaction_type: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
                    >
                      <option value="INITIAL_OUTREACH">Initial Outreach</option>
                      <option value="RECEIVED_REPLY">Received Reply</option>
                      <option value="FOLLOW_UP">Follow-up</option>
                      <option value="RESUME_SHARED">Resume Shared</option>
                      <option value="CALL">Call</option>
                      <option value="REFERRAL_OFFERED">Referral Offered</option>
                      <option value="APPLIED_THROUGH_REFERRAL">Applied Through Referral</option>
                      <option value="NOTE">Note</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Follow-up Date (Optional)</label>
                  <input
                    type="date"
                    value={interactionForm.follow_up_date}
                    onChange={(e) => setInteractionForm({ ...interactionForm, follow_up_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Message or Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={interactionForm.message_or_notes}
                    onChange={(e) => setInteractionForm({ ...interactionForm, message_or_notes: e.target.value })}
                    placeholder="Details about the interaction..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={closeInteractionModal} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button
                    type="submit"
                    disabled={createInteractionMutation.isPending || updateInteractionMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {createInteractionMutation.isPending || updateInteractionMutation.isPending ? 'Saving...' : 'Save Interaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contact Modal (Reusable for editing from detail view) */}
        {isContactModalOpen && (
          <ContactModal
            editingContact={editingContact}
            contactForm={contactForm}
            setContactForm={setContactForm}
            contactError={contactError}
            handleContactSubmit={handleContactSubmit}
            closeContactModal={closeContactModal}
            isPending={createContactMutation.isPending || updateContactMutation.isPending}
          />
        )}
      </div>
    );
  }

  // Main Contacts View
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Outreach & Networking</h1>
          <p className="text-slate-500 text-sm mt-1">Track professional relationships, conversations, follow-ups, and referrals.</p>
        </div>
        <button
          onClick={openAddContactModal}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-sm transition-colors"
        >
          + Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
          <h3 className="text-lg font-medium text-slate-900">No professional contacts yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
            Add contacts to start tracking your networking relationships and interaction timelines.
          </p>
          <div className="mt-6">
            <button
              onClick={openAddContactModal}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 shadow-sm transition-colors"
            >
              Add First Contact
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 md:px-6">Person Name</th>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">LinkedIn</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-4 md:px-6 font-semibold text-slate-900">
                      {contact.person_name}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {contact.company || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} className="text-indigo-600 hover:underline">
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {contact.linkedin_url ? (
                        <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-indigo-600 hover:underline">
                          Profile ↗
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600 max-w-xs truncate" title={contact.notes || ''}>
                      {contact.notes || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-4 px-4 text-right space-x-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedContactId(contact.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-900"
                      >
                        View Timeline
                      </button>
                      <button
                        onClick={(e) => openEditContactModal(contact, e)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${contact.person_name}? This will also delete all associated interactions.`)) {
                            deleteContactMutation.mutate(contact.id);
                          }
                        }}
                        className="text-xs font-semibold text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Contact Modal */}
      {isContactModalOpen && (
        <ContactModal
          editingContact={editingContact}
          contactForm={contactForm}
          setContactForm={setContactForm}
          contactError={contactError}
          handleContactSubmit={handleContactSubmit}
          closeContactModal={closeContactModal}
          isPending={createContactMutation.isPending || updateContactMutation.isPending}
        />
      )}
    </div>
  );
}

function ContactModal({ editingContact, contactForm, setContactForm, contactError, handleContactSubmit, closeContactModal, isPending }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg w-full p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingContact ? 'Edit Contact' : 'Add Professional Contact'}
          </h3>
          <button onClick={closeContactModal} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
        </div>

        {contactError && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">{contactError}</div>
        )}

        <form onSubmit={handleContactSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Person Name *</label>
            <input
              type="text"
              required
              value={contactForm.person_name}
              onChange={(e) => setContactForm({ ...contactForm, person_name: e.target.value })}
              placeholder="e.g. Rajesh Kumar"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Company (Optional)</label>
              <input
                type="text"
                value={contactForm.company}
                onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                placeholder="e.g. Acme Corp"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="rajesh@example.com"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Phone (Optional)</label>
              <input
                type="text"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                placeholder="+1 (555) 019-2834"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">LinkedIn URL (Optional)</label>
              <input
                type="url"
                value={contactForm.linkedin_url}
                onChange={(e) => setContactForm({ ...contactForm, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Notes (Optional)</label>
            <textarea
              rows={3}
              value={contactForm.notes}
              onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
              placeholder="Background context, mutual connections..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={closeContactModal} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}