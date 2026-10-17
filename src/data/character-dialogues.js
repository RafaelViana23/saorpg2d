export const CHARACTER_PROFILES = {
  "espadachim-sombrio": { name: "Kirito", role: "Espadachim", color: "#92d866" },
  "espadachim-laranja": { name: "Asuna", role: "Rapiera", color: "#e8b65c" },
  "guerreiro-vermelho": { name: "Klein", role: "Katana", color: "#e17a68" },
  "guerreiro-machado": { name: "Agil", role: "Tanque", color: "#d4a56c" },
  "guerreira-rosa": { name: "Lisbeth", role: "Ferreira", color: "#ee8bad" },
};

const dialogue = (intro, topic, trusted, close) => ({ intro, topic, trusted, close });

export const CHARACTER_DIALOGUES = {
  "espadachim-sombrio": dialogue(
    ["Não reconheço você. Mantenha a espada baixa.", "A Cidade Inicial parece segura. Parece.", "Se veio atrás de um grupo, escolheu a pessoa errada."],
    ["Os monstros dos campos atacam em padrões. Observe antes de avançar.", "Uma arma forte não corrige um passo em falso.", "As ruínas têm pontos cegos. Não fique parado neles."],
    ["Você aprende rápido. Isso é raro por aqui.", "Se formos lutar juntos, cubra minha retaguarda. Eu cubro a sua.", "Asuna disse que eu deveria confiar mais nas pessoas. Não conte a ela que ouvi."],
    ["Já confio em você. Não me faça admitir isso duas vezes.", "Se a situação piorar, fique atrás de mim. É uma ordem.", "Vamos chegar ao próximo andar juntos."],
  ),
  "espadachim-laranja": dialogue(
    ["Olá. Antes de sair da cidade, confira seus itens.", "Você é novo por aqui? Não subestime este mundo.", "Sobreviver vem antes de subir de nível."],
    ["Leve cristais e comida. Um grupo preparado volta inteiro.", "Aincrad recompensa coragem, não imprudência.", "Kirito parece distante, mas sempre percebe quando alguém precisa de ajuda."],
    ["Você tem sido responsável. Gosto de lutar com pessoas assim.", "Podemos explorar, mas prometemos recuar se ficar perigoso.", "Uma boa equipe conversa antes da batalha."],
    ["Conte comigo. Não vou deixar ninguém do grupo para trás.", "Depois desta missão, eu preparo algo para comermos.", "Nosso próximo objetivo é o andar acima."],
  ),
  "guerreiro-vermelho": dialogue(
    ["E aí, parceiro! Quer dizer... candidato a parceiro!", "Finalmente alguém com cara de que sabe se divertir.", "Klein, líder da melhor guilda que você ainda não conhece!"],
    ["Javalis, slimes, chefes... o segredo é atacar com estilo.", "Se encontrar uma katana rara, lembre do seu amigo Klein.", "Kirito paga de solitário, mas eu conheço aquele cara."],
    ["Você luta bem! Quase tão bem quanto eu em um dia ruim.", "Vamos formar uma dupla lendária. Ou pelo menos barulhenta.", "Com você no grupo, até grind parece passeio."],
    ["Parceiro, é só chamar que eu apareço.", "A gente ainda vai rir disso no centésimo andar.", "Ninguém mexe com a minha equipe."],
  ),
  "guerreiro-machado": dialogue(
    ["Bem-vindo. Viajantes atentos vivem mais.", "Respire e observe antes de escolher seu caminho.", "Equipamento confiável vale mais que aparência."],
    ["Use a cidade para se preparar. O campo não perdoa pressa.", "Uma boa defesa cria espaço para toda a equipe.", "Lisbeth entende de armas. Ouça quando ela reclama do seu equipamento."],
    ["Você demonstra bom julgamento. Isso inspira confiança.", "Posso segurar a linha enquanto você ataca.", "Volte vivo; sempre haverá outro negócio amanhã."],
    ["Você conquistou meu respeito e minha ajuda.", "Um grupo forte conhece os limites de cada membro.", "Caminharemos juntos até o fim."],
  ),
  "guerreira-rosa": dialogue(
    ["Ei, cuidado com essa espada! O fio está implorando por manutenção.", "Se veio pechinchar, pode dar meia-volta.", "Sou Lisbeth. E sim, eu já vi equipamento pior que o seu."],
    ["Minério das ruínas dá uma liga excelente.", "Uma arma tem personalidade. A sua está dizendo 'me conserta'.", "Asuna entende de qualidade. Kirito só entende de quebrar minhas melhores espadas."],
    ["Você trouxe material bom! Talvez tenha salvação.", "Posso melhorar seu equipamento... se tiver paciência.", "Explorar com você parece menos irritante do que eu esperava."],
    ["Eu cuido das armas e de você. Nessa ordem, talvez.", "Parceiros ganham desconto. Um desconto pequeno.", "Se sua espada quebrar, volte inteiro para eu poder reclamar."],
  ),
};

export const friendshipTier = (value = 0) =>
  value >= 15 ? "close" : value >= 8 ? "trusted" : value >= 4 ? "topic" : "intro";

export const friendshipLabel = (value = 0) =>
  value >= 15 ? "Amigo próximo" : value >= 8 ? "Amigo" : value >= 4 ? "Conhecido" : "Desconhecido";

export function randomConversation(characterId, friendship = 0) {
  const profile = CHARACTER_PROFILES[characterId];
  const tier = friendshipTier(friendship);
  const pool = CHARACTER_DIALOGUES[characterId]?.[tier] || ["Olá, aventureiro."];
  const line = pool[Math.floor(Math.random() * pool.length)];
  const invitation = friendship >= 4
    ? "Quer ser meu parceiro?"
    : `${profile?.name || "Este herói"} ainda precisa conhecer você melhor.`;
  return [line, invitation];
}
