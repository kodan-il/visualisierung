### Answers
#### 1. Are there textual differences - in wording - between different genres or genre combinations?
Yes, there are. Our word cloud visualization shows 15 most frequent words of the selected film genre (leaving out some words, that most of the genres have in common).
In that way you can see genre specific words like "love" and "friends" which are typical words of the genre "romance" or "police" and "murder" in the "crime" genre.
#### 2. Which genre combinations are there? And how often do they occur? Do films usually belong to multiple or only one genre? 
There are 7 combinations, ranging from 1 genre until 7 genre. 776 out of 5309 movies (≈15%) have a single genre, where the remainig 85% of it have multiples genre.
#### 3. Can the provided embedding - created with Nomic Embed and t-SNE - capture the differences in genre? For which genres does it work better? For which less so? Can you think of an explanation why?
You can actually discover differences in the embeddings of some genres. E.g. the films for genres like "history", "war", and "western" seam to cluster on the right side in the scatter plot (high x-values) 
whereas the genres "romance" and "music" do have more films embedded on the left side (low x-values). Reason for this could be the way, that the films are mapped to 2D coordinates.
Usually those word embeddings are managing to encode the context (thus the meaning) of words in a text corpus. That explains, why film genres/words of similar topics (war, history, violance)
are embedded similarly to each other and different to other topics (love, happiness, feelings). But because often film genres do not only include one topic (also not only one genre) its still difficult
to really identify genres, based on their 2D embeddings. Also, a two-dimensional embedding is a strongly reduced way to represent many different words at once and 
in the process of reducing the dimensions also some information will get lost. 