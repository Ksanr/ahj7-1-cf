// Хранилище тикетов (в памяти, сбрасывается при перезагрузке Worker'а)
const tickets = [
  {
    id: 'd8c41c67-7e2e-4b00-b5c3-709120a1d58c',
    name: 'Поменять краску в принтере, ком. 404',
    description: 'Принтер HP LJ-1210, картриджи на складе',
    status: false,
    created: 1778898029887,
  },
  {
    id: '28e63a9f-5f0a-4a5c-8cd7-6f88ce59ed68',
    name: 'Переустановить Windows, PC-Hall24',
    description: '',
    status: false,
    created: 1778898029887,
  },
  {
    id: 'f9f1df2b-886c-4217-b268-fda722feb9cf',
    name: 'Установить обновление KB-31642dv3875',
    description: 'Вышло критическое обновление для Windows',
    status: false,
    created: 1778898029887,
  },
];

// Вспомогательная функция для обёртки ответа в JSON
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Основной обработчик запросов
export default {
  async fetch(request, env, ctx) {
    // --- Настройка CORS ---
    // Разрешаем запросы только с вашего GitHub Pages
    const allowedOrigin = 'https://ksanr.github.io';
    const origin = request.headers.get('Origin');
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Обработка предварительного запроса OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Получаем URL и разбираем параметры
    const url = new URL(request.url);
    const method = url.searchParams.get('method');
    const id = url.searchParams.get('id');

    // Функция для добавления CORS-заголовков к любому ответу
    function withCORS(response) {
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => newHeaders.set(key, value));
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    // --- Маршрутизация ---
    try {
      // GET-запросы
      if (request.method === 'GET') {
        if (method === 'allTickets') {
          // Возвращаем тикеты без description
          const list = tickets.map(({ description, ...rest }) => rest);
          return withCORS(jsonResponse(list));
        }
        if (method === 'ticketById' && id) {
          const ticket = tickets.find(t => t.id === id);
          if (!ticket) return withCORS(jsonResponse({ error: 'Ticket not found' }, 404));
          return withCORS(jsonResponse(ticket));
        }
        if (method === 'deleteById' && id) {
          const index = tickets.findIndex(t => t.id === id);
          if (index === -1) return withCORS(jsonResponse({ error: 'Ticket not found' }, 404));
          tickets.splice(index, 1);
          return withCORS(new Response(null, { status: 204 }));
        }
      }

      // POST-запросы
      if (request.method === 'POST') {
        // createTicket
        if (method === 'createTicket') {
          const body = await request.json();
          const { name, description, status } = body;
          if (!name) return withCORS(jsonResponse({ error: 'Name is required' }, 400));
          const newTicket = {
            id: crypto.randomUUID(),
            name,
            description: description || '',
            status: status || false,
            created: Date.now(),
          };
          tickets.push(newTicket);
          // Отдаём без description
          const { description: _, ...rest } = newTicket;
          return withCORS(jsonResponse(rest, 201));
        }

        // updateById
        if (method === 'updateById' && id) {
          const ticket = tickets.find(t => t.id === id);
          if (!ticket) return withCORS(jsonResponse({ error: 'Ticket not found' }, 404));
          const { name, description, status } = await request.json();
          if (name !== undefined) ticket.name = name;
          if (description !== undefined) ticket.description = description;
          if (status !== undefined) ticket.status = status;
          const { description: _, ...updated } = ticket;
          return withCORS(jsonResponse(updated));
        }
      }

      // Если метод не найден
      return withCORS(jsonResponse({ error: 'Invalid method' }, 400));
    } catch (err) {
      return withCORS(jsonResponse({ error: err.message }, 500));
    }
  }
};
