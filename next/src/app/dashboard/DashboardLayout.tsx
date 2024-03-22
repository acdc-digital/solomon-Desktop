import Dashboardheader from "./_components/Dashboardheader";

const DashboardLayout: React.FC = ({ children }) => {
  return (
    <div>
      <Dashboardheader />
      <div className="dashboard-content">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;