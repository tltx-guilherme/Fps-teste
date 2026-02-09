      {/* Modal de Erros - Redesenhado */}
      {showErrosModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowErrosModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Simplificado */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Rotas com Erros</h2>
                    <p className="text-red-100 text-sm mt-1">Identifique e resolva problemas rapidamente</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowErrosModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Navegação entre Erros e Lentas */}
            <div className="bg-gray-50 px-8 py-4 border-b border-gray-200">
              <div className="flex gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-red-500 text-red-600 font-semibold rounded-lg shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Erros ({stats.recursosMaisUsados.filter(r => r.erros > 0).length})
                </button>
                <button
                  onClick={() => {
                    setShowErrosModal(false);
                    setShowSlowModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-600 font-medium rounded-lg hover:border-amber-400 hover:text-amber-600 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Lentidões ({stats.recursosMaisUsados.filter(r => r.lentas > 0).length})
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)] bg-gray-50">
              {/* Cards de Estatísticas */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 rounded-xl border-l-4 border-red-500 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total de Erros</p>
                      <p className="text-3xl font-bold text-red-600 mt-2">
                        {stats.estatisticasSaude?.error || 0}
                      </p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border-l-4 border-blue-500 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Rotas Afetadas</p>
                      <p className="text-3xl font-bold text-blue-600 mt-2">
                        {stats.recursosMaisUsados.filter(r => r.erros > 0).length}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border-l-4 border-orange-500 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Taxa de Erro</p>
                      <p className="text-3xl font-bold text-orange-600 mt-2">
                        {stats.estatisticasSaude ? 
                          (((stats.estatisticasSaude.error / stats.totalEventos) * 100).toFixed(1)) : 0}%
                      </p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Rotas */}
              {stats.recursosMaisUsados.filter(r => r.erros > 0).length > 0 ? (
                <div className="space-y-3">
                  {stats.recursosMaisUsados
                    .filter(r => r.erros > 0)
                    .sort((a, b) => b.taxaErro - a.taxaErro)
                    .map((r, idx) => (
                      <div 
                        key={r.categoria}
                        className="bg-white rounded-xl p-5 border border-gray-200 hover:border-red-300 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => {
                          setSelectedRecurso(r);
                          setShowErrosModal(false);
                        }}
                      >
                        <div className="flex items-center gap-4">
                          {/* Ranking Badge */}
                          <div className="flex-shrink-0">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg ${
                              idx === 0 ? 'bg-gradient-to-br from-red-500 to-red-600' :
                              idx === 1 ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                              idx === 2 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                              'bg-gradient-to-br from-gray-400 to-gray-500'
                            }`}>
                              {idx + 1}
                            </div>
                          </div>

                          {/* Informação da Rota */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-base mb-1 truncate group-hover:text-red-600 transition-colors">
                              {r.categoria}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                {r.quantidade.toLocaleString()} acessos
                              </span>
                              <span className="flex items-center gap-1 text-red-600 font-medium">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {r.erros} erros
                              </span>
                            </div>
                          </div>

                          {/* Taxa de Erro */}
                          <div className="flex-shrink-0 text-right">
                            <div className="text-3xl font-bold text-red-600">{r.taxaErro}%</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Taxa de Erro</div>
                          </div>

                          {/* Ícone de Ação */}
                          <div className="flex-shrink-0">
                            <svg className="w-6 h-6 text-gray-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
                  <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Tudo funcionando perfeitamente!</h3>
                  <p className="text-gray-600">Nenhum erro foi encontrado nas suas rotas.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rotas Lentas - Redesenhado */}
      {showSlowModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSlowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Simplificado */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Rotas com Lentidões</h2>
                    <p className="text-amber-100 text-sm mt-1">Otimize o desempenho das suas rotas</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSlowModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Navegação entre Erros e Lentas */}
            <div className="bg-gray-50 px-8 py-4 border-b border-gray-200">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowSlowModal(false);
                    setShowErrosModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-600 font-medium rounded-lg hover:border-red-400 hover:text-red-600 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Erros ({stats.recursosMaisUsados.filter(r => r.erros > 0).length})
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-amber-500 text-amber-600 font-semibold rounded-lg shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Lentidões ({stats.recursosMaisUsados.filter(r => r.lentas > 0).length})
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)] bg-gray-50">
              {/* Cards de Estatísticas */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 rounded-xl border-l-4 border-amber-500 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total de Lentidões</p>
                      <p className="text-3xl font-bold text-amber-600 mt-2">
                        {stats.estatisticasSaude?.slow || 0}
                      </p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border-l-4 border-blue-500 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Rotas Afetadas</p>
                      <p className="text-3xl font-bold text-blue-600 mt-2">
                        {stats.recursosMaisUsados.filter(r => r.lentas > 0).length}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border-l-4 border-orange-500 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Taxa de Lentidão</p>
                      <p className="text-3xl font-bold text-orange-600 mt-2">
                        {stats.estatisticasSaude ? 
                          (((stats.estatisticasSaude.slow / stats.totalEventos) * 100).toFixed(1)) : 0}%
                      </p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Rotas */}
              {stats.recursosMaisUsados.filter(r => r.lentas > 0).length > 0 ? (
                <div className="space-y-3">
                  {stats.recursosMaisUsados
                    .filter(r => r.lentas > 0)
                    .sort((a, b) => b.taxaLenta - a.taxaLenta)
                    .map((r, idx) => (
                      <div 
                        key={r.categoria}
                        className="bg-white rounded-xl p-5 border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => {
                          setSelectedRecurso(r);
                          setShowSlowModal(false);
                        }}
                      >
                        <div className="flex items-center gap-4">
                          {/* Ranking Badge */}
                          <div className="flex-shrink-0">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg ${
                              idx === 0 ? 'bg-gradient-to-br from-red-500 to-red-600' :
                              idx === 1 ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                              idx === 2 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                              'bg-gradient-to-br from-gray-400 to-gray-500'
                            }`}>
                              {idx + 1}
                            </div>
                          </div>

                          {/* Informação da Rota */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-base mb-1 truncate group-hover:text-amber-600 transition-colors">
                              {r.categoria}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                {r.quantidade.toLocaleString()} acessos
                              </span>
                              <span className="flex items-center gap-1 text-amber-600 font-medium">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {r.lentas} lentas
                              </span>
                            </div>
                          </div>

                          {/* Taxa de Lentidão */}
                          <div className="flex-shrink-0 text-right">
                            <div className="text-3xl font-bold text-amber-600">{r.taxaLenta}%</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Taxa de Lentidão</div>
                          </div>

                          {/* Ícone de Ação */}
                          <div className="flex-shrink-0">
                            <svg className="w-6 h-6 text-gray-400 group-hover:text-amber-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
                  <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Desempenho excelente!</h3>
                  <p className="text-gray-600">Nenhuma lentidão foi detectada nas suas rotas.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
