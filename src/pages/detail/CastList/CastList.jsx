import { Link } from 'react-router-dom';
import apiConfig from '../../../api/apiConfig';

const getInitials = (name) => {
    if (!name) return '?';
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join('');
};

const CastList = ({ casts = [] }) => {
    const displayCasts = casts.slice(0, 8);

    return (
        <div className="casts">
            {displayCasts.map((item, i) => (
                <Link
                    key={i}
                    to={`/person/${item.id}`}
                    className="casts__item"
                    aria-label={`See filmography for ${item.name}`}
                >
                    {item.profile_path ? (
                        <div
                            className="casts__item__img"
                            style={{ backgroundImage: `url(${apiConfig.w500Image(item.profile_path)})` }}
                        ></div>
                    ) : (
                        <div className="casts__item__img casts__item__img--placeholder">
                            <span>{getInitials(item.name)}</span>
                        </div>
                    )}
                    <p className="casts__item__name">{item.name}</p>
                </Link>
            ))}
        </div>
    );
};

export default CastList;
