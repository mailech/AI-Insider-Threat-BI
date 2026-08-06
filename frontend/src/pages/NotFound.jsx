import { Link } from "react-router-dom";
import "../styles/notfound.css";

function NotFound() {

    return (

        <div className="notfound-container">

            <div className="notfound-card">

                <h1>404</h1>

                <h2>Page Not Found</h2>

                <p>

                    The page you are looking for does not exist.

                </p>

                <Link to="/dashboard">

                    <button>

                        Go Home

                    </button>

                </Link>

            </div>

        </div>

    );

}

export default NotFound;