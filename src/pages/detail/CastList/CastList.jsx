import apiConfig from '../../../api/apiConfig';


const CastList = ({ casts = [] }) => {
    const displayCasts = casts.slice(0, 8);

    return (
        <div className="casts">
            {
                displayCasts.map((item, i) => (
                    <div key={i} className="casts__item">
                        {item.profile_path && <div className="casts__item__img" style={{backgroundImage: `url(${apiConfig.w500Image(item.profile_path)})`}}></div>}
                        {item.profile_path && <p className="casts__item__name">{item.name}</p>}
                    </div>
                ))
            }
        </div>
    );
}

export default CastList;
