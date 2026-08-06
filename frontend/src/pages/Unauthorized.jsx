import { Link } from "react-router-dom";
import "../styles/unauthorized.css";

function Unauthorized() {

    return (

        <div className="unauthorized-container">

            <div className="unauthorized-card">

                <h1>403</h1>

                <h2>Access Denied</h2>

                <p>

                    You don't have permission to access this page.

                </p>

                <Link to="/dashboard">

                    <button>

                        Back to Dashboard

                    </button>

                </Link>

            </div>

        </div>

    );

}

export default Unauthorized;