import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import tmdbApi from "../../api/tmdbApi";
import apiConfig from "../../api/apiConfig";
import Loading from "../../components/loading/Loading";
import "./person.scss";

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const computeAge = (birthday, deathday) => {
  if (!birthday) return null;
  const end = deathday ? new Date(deathday) : new Date();
  const birth = new Date(birthday);
  let years = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) years--;
  return years;
};

const Person = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [credits, setCredits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        if (id && isNaN(Number(id))) {
          window.location.href = "/";
          return;
        }
        const [personData, creditsData] = await Promise.all([
          tmdbApi.person(id),
          tmdbApi.personCombinedCredits(id),
        ]);
        setPerson(personData);

        const seen = new Set();
        const filmography = (creditsData.cast || [])
          .filter((c) => {
            const key = `${c.media_type}-${c.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => {
            const da = new Date(a.release_date || a.first_air_date || 0);
            const db = new Date(b.release_date || b.first_air_date || 0);
            return db - da;
          });
        setCredits(filmography);
        window.scrollTo(0, 0);
      } catch (err) {
        console.error("Error fetching person:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line
  }, [id]);

  if (isLoading) return <Loading size="large" />;
  if (!person) return null;

  const profileImg = person.profile_path
    ? apiConfig.originalImage(person.profile_path)
    : null;
  const age = computeAge(person.birthday, person.deathday);
  const bio = (person.biography || "").trim();
  const isBioLong = bio.length > 600;
  const visibleBio =
    bioExpanded || !isBioLong ? bio : bio.slice(0, 600).trimEnd() + "…";

  return (
    <div className="person-page">
      <div className="container person-back-wrap">
        <button
          type="button"
          className="person-back-btn"
          onClick={handleBack}
          aria-label="Go back"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>Back</span>
        </button>
      </div>
      <div className="person-header">
        <div className="container person-header__wrap">
          <div className="person-header__photo">
            {profileImg ? (
              <div
                className="person-header__photo-img"
                style={{ backgroundImage: `url(${profileImg})` }}
              ></div>
            ) : (
              <div className="person-header__photo-img person-header__photo-img--placeholder">
                <span>{getInitials(person.name)}</span>
              </div>
            )}
          </div>

          <div className="person-header__info">
            <h1 className="person-header__name stagger-1">{person.name}</h1>
            {person.known_for_department && (
              <p className="person-header__role stagger-2">
                {person.known_for_department}
              </p>
            )}

            <div className="person-header__meta stagger-3">
              {person.birthday && (
                <span>
                  Born {formatDate(person.birthday)}
                  {age != null && !person.deathday ? ` (age ${age})` : ""}
                </span>
              )}
              {person.deathday && (
                <>
                  <span className="meta-divider"></span>
                  <span>Died {formatDate(person.deathday)}</span>
                </>
              )}
              {person.place_of_birth && (
                <>
                  <span className="meta-divider"></span>
                  <span>{person.place_of_birth}</span>
                </>
              )}
            </div>

            {bio && (
              <div className="person-header__bio stagger-4">
                <p>{visibleBio}</p>
                {isBioLong && (
                  <button
                    type="button"
                    className="bio-toggle"
                    onClick={() => setBioExpanded((v) => !v)}
                  >
                    {bioExpanded ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="section mb-3">
          <div className="section__header mb-2 filmography-header">
            <h2>Filmography</h2>
            {credits.length > 0 && (() => {
              const movies = credits.filter((c) => c.media_type === "movie").length;
              const series = credits.filter((c) => c.media_type === "tv").length;
              const parts = [];
              if (movies > 0) parts.push(`${movies} ${movies === 1 ? "Movie" : "Movies"}`);
              if (series > 0) parts.push(`${series} ${series === 1 ? "Series" : "Series"}`);
              return (
                <span className="filmography-count">
                  {parts.map((p, i) => (
                    <React.Fragment key={p}>
                      {i > 0 && <span className="filmography-count__sep">·</span>}
                      {p}
                    </React.Fragment>
                  ))}
                </span>
              );
            })()}
          </div>

          {credits.length > 0 ? (
            <div className="filmography-grid">
              {credits.map((c) => {
                const dateStr = c.release_date || c.first_air_date;
                const year = dateStr ? new Date(dateStr).getFullYear() : null;
                const poster = c.poster_path
                  ? apiConfig.w500Image(c.poster_path)
                  : null;
                return (
                  <Link
                    key={`${c.media_type}-${c.id}`}
                    to={`/${c.media_type}/${c.id}`}
                    className="filmography-card"
                  >
                    <div
                      className={`filmography-card__poster${
                        poster ? "" : " filmography-card__poster--empty"
                      }`}
                      style={
                        poster ? { backgroundImage: `url(${poster})` } : undefined
                      }
                    >
                      {!poster && (
                        <span className="filmography-card__no-poster">
                          {c.title || c.name}
                        </span>
                      )}
                      <span
                        className={`filmography-card__badge filmography-card__badge--${c.media_type}`}
                      >
                        {c.media_type === "tv" ? "Series" : "Movie"}
                      </span>
                      {c.vote_average > 0 && (
                        <span className="filmography-card__rating">
                          <i className="bx bxs-star"></i>
                          {c.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="filmography-card__meta">
                      <h3>{c.title || c.name}</h3>
                      <div className="filmography-card__sub">
                        {year && <span>{year}</span>}
                        {c.character && (
                          <span className="filmography-card__character">
                            as {c.character}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="filmography-empty">No filmography available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Person;
