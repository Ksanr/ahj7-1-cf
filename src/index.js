const tickets = [
  { id: 'd8c41c67-7e2e-4b00-b5c3-709120a1d58c', name: 'Поменять краску в принтере, ком. 404', description: 'Принтер HP LJ-1210, картриджи на складе', status: false, created: 1778898029887 },
  { id: '28e63a9f-5f0a-4a5c-8cd7-6f88ce59ed68', name: 'Переустановить Windows, PC-Hall24', description: '', status: false, created: 1778898029887 },
  { id: 'f9f1df2b-886c-4217-b268-fda722feb9cf', name: 'Установить обновление KB-31642dv3875', description: 'Вышло критическое обновление для Windows', status: false, created: 1778898029887 },
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function addCorsHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    // Обработка CORS preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    const url = new URL(request.url);
    const method = url.searchParams.get('method');
    const id = url.searchParams.get('id');

    try {
      if (request.method === 'GET') {
        if (method === 'allTickets') {
          const list = tickets.map(({ description, ...rest }) => rest);
          return addCorsHeaders(jsonResponse(list));
        }
        if (method === 'ticketById' && id) {
          const ticket = tickets.find(t => t.id === id);
          if (!ticket) return addCorsHeaders(jsonResponse({ error: 'Ticket not found' }, 404));
          return addCorsHeaders(jsonResponse(ticket));
        }
        if (method === 'deleteById' && id) {
          const index = tickets.findIndex(t => t.id === id);
          if (index === -1) return addCorsHeaders(jsonResponse({ error: 'Ticket not found' }, 404));
          tickets.splice(index, 1);
          return addCorsHeaders(new Response(null, { status: 204 }));
        }
      }

      if (request.method === 'POST') {
        if (method === 'createTicket') {
          const body = await request.json();
          const { name, description, status } = body;
          if (!name) return addCorsHeaders(jsonResponse({ error: 'Name is required' }, 400));
          const newTicket = { id: crypto.randomUUID(), name, description: description || '', status: status || false, created: Date.now() };
          tickets.push(newTicket);
          const { description: _, ...rest } = newTicket;
          return addCorsHeaders(jsonResponse(rest, 201));
        }
        if (method === 'updateById' && id) {
          const ticket = tickets.find(t => t.id === id);
          if (!ticket) return addCorsHeaders(jsonResponse({ error: 'Ticket not found' }, 404));
          const { name, description, status } = await request.json();
          if (name !== undefined) ticket.name = name;
          if (description !== undefined) ticket.description = description;
          if (status !== undefined) ticket.status = status;
          const { description: _, ...updated } = ticket;
          return addCorsHeaders(jsonResponse(updated));
        }
      }

      return addCorsHeaders(jsonResponse({ error: 'Invalid method' }, 400));
    } catch (err) {
      return addCorsHeaders(jsonResponse({ error: err.message }, 500));
    }
  }
};
