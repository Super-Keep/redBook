import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/chat', label: '💬 对话', description: '与数字员工对话' },
  { to: '/notes', label: '📝 内容管理', description: '管理笔记内容' },
  { to: '/strategy', label: '📊 运营策略', description: '查看运营计划' },
  { to: '/analytics', label: '📈 数据分析', description: '运营数据仪表盘' },
];

function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <nav
        style={{
          width: 220,
          backgroundColor: '#1a1a2e',
          color: '#fff',
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '0 20px 20px',
            borderBottom: '1px solid #333',
            marginBottom: 10,
          }}
        >
          <h1 style={{ fontSize: 18, margin: 0 }}>🤖 AI数字员工</h1>
          <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0' }}>
            智能运营平台
          </p>
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'block',
              padding: '12px 20px',
              color: isActive ? '#fff' : '#ccc',
              backgroundColor: isActive ? '#16213e' : 'transparent',
              textDecoration: 'none',
              fontSize: 14,
              borderLeft: isActive ? '3px solid #0f3460' : '3px solid transparent',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: 24, backgroundColor: '#f5f5f5' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
