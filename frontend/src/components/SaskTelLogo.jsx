import logo from "../assets/sasktel-logo.png";

// The supplied PNG has transparent padding. CSS frames the visible logo;
// the original asset is preserved unchanged.
export default function SaskTelLogo() {
  return (
    <span className="sasktel-logo">
      <img src={logo} alt="SaskTel" />
    </span>
  );
}
