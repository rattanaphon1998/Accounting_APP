import { Link } from "react-router";

export default function NotFoundPage() {
    return (
        <div>
            <h1>404</h1>
            <p>Page not found</p>
            <p>
                <Link to="/">Go back to the homepage</Link>
            </p>
        </div>
    );
}