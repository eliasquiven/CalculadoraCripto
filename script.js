document.addEventListener('DOMContentLoaded', function () {
    const cryptoSelect = document.getElementById('crypto');
    const currencySelect = document.getElementById('currency');
    const investmentLabel = document.querySelector('label[for="investment"]');
    const investmentInput = document.getElementById('investment');
    const feesInput = document.getElementById('fees'); // Campo das taxas
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');

    // Atualizar o label do valor investido com base na moeda selecionada
    function updateInvestmentLabel() {
        const currency = currencySelect.value.toUpperCase();
        investmentLabel.textContent = `Valor Investido (${currency}):`;

        // Atualizar o label das taxas
        const feesLabel = document.querySelector('label[for="fees"]');
        feesLabel.textContent = `Taxas de Negociação (${currency}):`;
    }

    currencySelect.addEventListener('change', function () {
        updateInvestmentLabel();
    });

    // Atualizar o label ao carregar a página
    updateInvestmentLabel();

    // Função para carregar as top 20 criptomoedas
    function loadTopCryptos() {
        fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false')
            .then(response => response.json())
            .then(data => {
                // Limpar o menu suspenso antes de adicionar as opções
                cryptoSelect.innerHTML = '';

                // Garantir que o Bitcoin seja o primeiro da lista
                let bitcoin = data.find(coin => coin.id === 'bitcoin');

                // Se o Bitcoin não estiver na lista (por alguma razão), adicioná-lo manualmente
                if (!bitcoin) {
                    bitcoin = { id: 'bitcoin', name: 'Bitcoin' };
                } else {
                    // Remover o Bitcoin da posição atual
                    data = data.filter(coin => coin.id !== 'bitcoin');
                }

                // Adicionar o Bitcoin no início da lista
                data.unshift(bitcoin);

                // Adicionar as opções ao menu suspenso
                data.forEach(coin => {
                    const option = document.createElement('option');
                    option.value = coin.id;
                    option.textContent = coin.name;
                    cryptoSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Erro ao carregar as criptomoedas:', error);
                alert('Não foi possível carregar a lista de criptomoedas.');
            });
    }

    loadTopCryptos();

    // Função para converter uma data no formato "YYYY-MM-DD" para timestamp UNIX em segundos no fuso horário local
    function dateStringToTimestamp(dateString, isEndOfDay) {
        if (!dateString) {
            return null;
        }
        const [year, month, day] = dateString.split('-').map(Number);
        let date;
        if (isEndOfDay) {
            date = new Date(year, month - 1, day, 23, 59, 59);
        } else {
            date = new Date(year, month - 1, day, 0, 0, 0);
        }
        return Math.floor(date.getTime() / 1000);
    }

    document.getElementById('investmentForm').addEventListener('submit', function (e) {
        e.preventDefault();

        // Obter os valores do formulário
        const cryptoId = cryptoSelect.value;
        const currency = currencySelect.value;
        const currencyUpper = currency.toUpperCase();
        const investment = parseFloat(investmentInput.value);
        const feesAmount = parseFloat(feesInput.value); // Obter as taxas como valor
        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;

        // Validação do valor investido
        if (investment <= 0) {
            alert("O valor investido deve ser maior que zero.");
            return;
        }

        // Validação das taxas
        if (feesAmount < 0) {
            alert("As taxas de negociação não podem ser negativas.");
            return;
        }

        // Verificações de data
        const currentTimestamp = Math.floor(Date.now() / 1000);

        let fromTimestamp;
        if (fromDate) {
            fromTimestamp = dateStringToTimestamp(fromDate, false);
        } else {
            // Se a data inicial não for fornecida, definir como 0 (início do UNIX time)
            fromTimestamp = 0;
        }

        const toTimestamp = dateStringToTimestamp(toDate, true);

        if (fromTimestamp > toTimestamp) {
            alert("A data inicial não pode ser posterior à data final.");
            return;
        }

        if (toTimestamp > currentTimestamp) {
            alert("A data final não pode ser no futuro.");
            return;
        }

        // URL da API CoinGecko para obter dados de preços no intervalo de datas
        const apiUrl = `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart/range?vs_currency=${currency}&from=${fromTimestamp}&to=${toTimestamp}`;

        // Chamada à API usando fetch
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.prices && data.prices.length > 0) {
                    const prices = data.prices;

                    // Ordenar preços por timestamp
                    prices.sort((a, b) => a[0] - b[0]);

                    // Preço no início do período
                    const initialPrice = prices[0][1];

                    // Preço no final do período
                    const finalPrice = prices[prices.length - 1][1];

                    // Cálculo da quantidade de criptomoeda comprada
                    const cryptoPurchased = investment / initialPrice;

                    // Valor atual do investimento
                    const currentValue = cryptoPurchased * finalPrice;

                    // Cálculo do lucro sem taxas
                    const profitWithoutFees = currentValue - investment;

                    // Cálculo do lucro com taxas
                    const profitWithFees = profitWithoutFees - feesAmount;

                    // Cálculo da porcentagem de lucro/prejuízo sem taxas
                    const profitPercentageWithoutFees = (profitWithoutFees / investment) * 100;

                    // Cálculo da porcentagem de lucro/prejuízo com taxas
                    const profitPercentageWithFees = (profitWithFees / investment) * 100;

                    // Definir classes para estilização do lucro/prejuízo
                    const profitClassWithoutFees = profitWithoutFees >= 0 ? 'profit' : 'loss';
                    const profitClassWithFees = profitWithFees >= 0 ? 'profit' : 'loss';

                    // Opções de formatação de data com fuso horário de Brasília
                    const options = { timeZone: 'America/Sao_Paulo' };

                    // Preparação dos dados para os gráficos
                    const graphDates = prices.map(pricePoint => {
                        const date = new Date(pricePoint[0]);
                        return date.toLocaleDateString('pt-BR', options);
                    });

                    const graphPrices = prices.map(pricePoint => pricePoint[1]);

                    // Cálculo do valor do investimento ao longo do tempo
                    const investmentValues = prices.map(pricePoint => {
                        const price = pricePoint[1];
                        return cryptoPurchased * price;
                    });

                    // Configuração de cores para os gráficos com base no lucro ou prejuízo sem taxas
                    const isProfit = profitWithoutFees >= 0;

                    // Definir cores com base no lucro ou prejuízo
                    const lineColor = isProfit ? 'rgba(39, 174, 96, 1)' : 'rgba(231, 76, 60, 1)';
                    const backgroundColor = isProfit ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)';

                    // --- Gráfico 1: Preço da Criptomoeda ---
                    const ctxPrice = document.getElementById('priceChart').getContext('2d');
                    if (window.priceChart instanceof Chart) {
                        window.priceChart.destroy();
                    }
                    window.priceChart = new Chart(ctxPrice, {
                        type: 'line',
                        data: {
                            labels: graphDates,
                            datasets: [{
                                label: `Preço de ${cryptoSelect.options[cryptoSelect.selectedIndex].text} (${currencyUpper})`,
                                data: graphPrices,
                                borderColor: '#3498db',
                                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                                fill: true,
                                tension: 0.1,
                                pointRadius: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    display: true,
                                    title: {
                                        display: true,
                                        text: 'Data'
                                    },
                                    ticks: {
                                        autoSkip: true,
                                        maxTicksLimit: 10
                                    }
                                },
                                y: {
                                    display: true,
                                    title: {
                                        display: true,
                                        text: `Preço (${currencyUpper})`
                                    }
                                }
                            },
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            plugins: {
                                tooltip: {
                                    mode: 'index',
                                    intersect: false
                                }
                            }
                        }
                    });

                    // --- Gráfico 2: Valor do Investimento ---
                    const ctxInvestment = document.getElementById('investmentChart').getContext('2d');

                    if (window.investmentChart instanceof Chart) {
                        window.investmentChart.destroy();
                    }
                    window.investmentChart = new Chart(ctxInvestment, {
                        type: 'line',
                        data: {
                            labels: graphDates,
                            datasets: [{
                                label: `Valor do Investimento (${currencyUpper})`,
                                data: investmentValues,
                                borderColor: lineColor,
                                backgroundColor: backgroundColor,
                                fill: true,
                                tension: 0.1,
                                pointRadius: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    display: true,
                                    title: {
                                        display: true,
                                        text: 'Data'
                                    },
                                    ticks: {
                                        autoSkip: true,
                                        maxTicksLimit: 10
                                    }
                                },
                                y: {
                                    display: true,
                                    title: {
                                        display: true,
                                        text: `Valor (${currencyUpper})`
                                    }
                                }
                            },
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            plugins: {
                                tooltip: {
                                    mode: 'index',
                                    intersect: false
                                }
                            }
                        }
                    });

                    // Formatação de números
                    const formatter = new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: currencyUpper,
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });

                    // Exibição dos resultados abaixo dos gráficos
                    document.getElementById('results').innerHTML = `
                        <h2>Resultados:</h2>
                        <p>Criptomoeda: <strong>${cryptoSelect.options[cryptoSelect.selectedIndex].text}</strong></p>
                        <p>Valor Investido: <strong>${formatter.format(investment)}</strong></p>
                        <p>Taxas de Negociação: <strong>${formatter.format(feesAmount)}</strong></p>
                        <p>Data Inicial: <strong>${fromDate ? new Date(fromTimestamp * 1000).toLocaleDateString('pt-BR', options) : 'Desde o Início'}</strong></p>
                        <p>Data Final: <strong>${new Date(toTimestamp * 1000).toLocaleDateString('pt-BR', options)}</strong></p>
                        <p>Preço no Início do Período: <strong>${formatter.format(initialPrice)}</strong></p>
                        <p>Preço no Final do Período: <strong>${formatter.format(finalPrice)}</strong></p>
                        <p>Quantidade Comprada: <strong>${cryptoPurchased.toFixed(6)} ${cryptoSelect.options[cryptoSelect.selectedIndex].text}</strong></p>
                        <p>Valor Atual do Investimento: <strong>${formatter.format(currentValue)}</strong></p>
                        <h3>Lucro/Prejuízo Sem Taxas:</h3>
                        <p><strong class="${profitClassWithoutFees}"> ${formatter.format(profitWithoutFees)} (${profitPercentageWithoutFees.toFixed(2)}%)</strong></p>
                        <h3>Lucro/Prejuízo Com Taxas:</h3>
                        <p><strong class="${profitClassWithFees}"> ${formatter.format(profitWithFees)} (${profitPercentageWithFees.toFixed(2)}%)</strong></p>
                    `;
                } else {
                    alert("Falha ao obter dados de preço da criptomoeda selecionada. Talvez a data inicial seja muito antiga.");
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                alert("Ocorreu um erro ao processar sua solicitação.");
            });
    });
});
