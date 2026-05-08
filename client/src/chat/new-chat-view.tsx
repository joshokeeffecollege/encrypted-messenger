import { useState } from "react";
import type { AuthUser } from "../auth/user";
import { searchUser } from "./search-user";
import { useAction } from "../shared/async-data";

interface NewChatProps {
  user: AuthUser;
  serverUrl: string;
  onOpenChat: (peerUsername: string) => void;
}

export const NewChat: React.FC<NewChatProps> = ({
  user,
  serverUrl,
  onOpenChat,
}) => {
  // this screen looks up who to chat with
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [searchFeedback, setSearchFeedback] = useState("");
  const [hasSubmittedSearch, setHasSubmittedSearch] = useState(false);
  const {
    loading,
    clearError,
    run: runPeerCheck,
  } = useAction(
    // search button uses this async helper
    (peerUsername: string) =>
      searchUser({
        serverUrl,
        userId: user.id,
        peerUsername,
      }),
    "Could not find that user on the selected server.",
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = search.trim();

    // clear stuff if the box is empty
    if (!trimmed) {
      setHasSubmittedSearch(false);
      setResults([]);
      setSearchFeedback("");
      return;
    }

    setHasSubmittedSearch(true);
    clearError();
    setSearchFeedback("");

    try {
      // right now we only show one result back
      const result = await runPeerCheck(trimmed);
      setResults([result.username]);
    } catch {
      // failed search just shows empty results text
      setResults([]);
      setSearchFeedback("No matching user was found.");
    }
  }

  return (
    <div className="new-chat-view">
      <div className="new-chat-shell">
        <div className="new-chat-shell__header">
          <div>
            <h2 className="new-chat-shell__title">Search for a user</h2>
            <p className="new-chat-shell__copy">
              Enter a local username or a full remote handle, then choose a
              result to start chatting.
            </p>
          </div>
        </div>

        <div className="new-chat-search-card">
          <form onSubmit={handleSubmit} className="new-chat-form">
            <label className="new-chat-form__label" htmlFor="new-chat-input">
              Username or remote handle
            </label>
            <div className="new-chat-form__row">
              <input
                id="new-chat-input"
                type="text"
                className="form-control new-chat-form__input"
                placeholder="e.g. alice or bob@server.example"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  clearError();
                }}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-primary new-chat-form__submit"
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {hasSubmittedSearch && (
            <div className="new-chat-results">
              <div className="new-chat-results__header">
                <h3 className="new-chat-results__title">Results</h3>
                <span className="new-chat-results__meta">
                  {results.length === 0 ? "No matches yet" : `${results.length} match`}
                </span>
              </div>

              {results.length === 0 ? (
                // show the search feedback when nothing matched
                <div className="new-chat-results__empty">
                  {searchFeedback || "No matching user was found."}
                </div>
              ) : (
                <div className="new-chat-results__list">
                  {results.map((username) => (
                    // clicking a result jumps straight into that chat
                    <button
                      key={username}
                      type="button"
                      className="new-chat-result-row"
                      onClick={() => onOpenChat(username)}
                    >
                      <div className="new-chat-result-row__avatar">
                        {username.charAt(0).toUpperCase()}
                      </div>
                      <div className="new-chat-result-row__content">
                        <div className="new-chat-result-row__name">{username}</div>
                        <div className="new-chat-result-row__meta">
                          Click to start a secure chat
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
